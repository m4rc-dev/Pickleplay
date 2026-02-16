import { supabase } from './supabase';
import { Subscription, SubscriptionPlan } from '../types';

export const getSubscription = async (userId: string): Promise<{ data: Subscription | null; error: any }> => {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('court_owner_id', userId)
        .maybeSingle();

    return { data, error };
};

export const createTrialSubscription = async (userId: string): Promise<{ data: Subscription | null; error: any }> => {
    const { data, error } = await supabase
        .from('subscriptions')
        .insert({
            court_owner_id: userId,
            status: 'trial',
            trial_started_at: new Date().toISOString(),
            trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .select()
        .single();

    return { data, error };
};

export const getSubscriptionPlans = async (): Promise<{ data: SubscriptionPlan[] | null; error: any }> => {
    const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true);

    return { data, error };
};

export const calculateDaysRemaining = (endDateStr: string): number => {
    const now = new Date();
    const endDate = new Date(endDateStr);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
};

/**
 * Calculate how many grace period days remain after trial expiration
 * Grace period is 10 days after trial ends
 * Returns 0 if still in trial or beyond grace period
 */
export const calculateGraceDaysRemaining = (trialEndDateStr: string): number => {
    const GRACE_PERIOD_DAYS = 10;
    const now = new Date();
    const trialEndDate = new Date(trialEndDateStr);

    // If trial hasn't ended yet, no grace period
    if (now < trialEndDate) return 0;

    // Calculate days since trial ended
    const daysSinceExpiration = Math.floor((now.getTime() - trialEndDate.getTime()) / (1000 * 60 * 60 * 24));

    // Return remaining grace days (0 if beyond grace period)
    const graceDaysLeft = GRACE_PERIOD_DAYS - daysSinceExpiration;
    return graceDaysLeft > 0 ? graceDaysLeft : 0;
};

/**
 * Check if subscription is in grace period (trial expired but within 10 days)
 */
export const isInGracePeriod = (subscription: Subscription): boolean => {
    if (subscription.status !== 'trial' || !subscription.trial_ends_at) return false;

    const daysRemaining = calculateDaysRemaining(subscription.trial_ends_at);
    const graceDays = calculateGraceDaysRemaining(subscription.trial_ends_at);

    return daysRemaining === 0 && graceDays > 0;
};

/**
 * Check if subscription is hard locked (trial expired + grace period expired)
 */
export const isHardLocked = (subscription: Subscription): boolean => {
    if (subscription.status === 'active') return false;
    if (subscription.status === 'trial' && subscription.trial_ends_at) {
        const daysRemaining = calculateDaysRemaining(subscription.trial_ends_at);
        const graceDays = calculateGraceDaysRemaining(subscription.trial_ends_at);
        return daysRemaining === 0 && graceDays === 0;
    }
    return subscription.status === 'expired';
};

/**
 * Activate a paid subscription for a user
 */
export const subscribeToPlan = async (userId: string, planId: string): Promise<{ success: boolean; error?: any }> => {
    const { error } = await supabase
        .from('subscriptions')
        .update({
            status: 'active',
            plan_id: planId,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days for now
        })
        .eq('court_owner_id', userId);

    return { success: !error, error };
};


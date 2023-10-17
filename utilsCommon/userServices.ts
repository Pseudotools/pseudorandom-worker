import { supabaseServiceRoleClient } from './supabaseServiceClient';

import { UserProfile } from '@/types/UserProfile';

// Get User
// given a userId, return the corresponding UserProfile object
// 
export const getUserProfileById = async (userId: string): Promise<UserProfile> => {
    const { data, error } = await supabaseServiceRoleClient
        .from('userProfiles') 
        .select('*')  // Selecting only the required fields
        .eq('userId', userId)
        .single();  // Expecting a single record

    if (error) {
        const message = `Failed to retrieve user ${userId}`;
        console.error(message, error);
        throw new Error(message);
    }

    if (!data) {
        const message = `No user found with ID ${userId}.`;
        console.error(message);
        throw new Error(message);
    }

    //console.log(`User ${userId} retrieved successfully.`);
    return data;
};



// Vaidate User PAT
// given a userId, return the corresponding UserProfile object
// 
export const validatePAT = async (userId: string, token: string): Promise<boolean> => {
    const { data, error } = await supabaseServiceRoleClient
        .from('userPats')
        .select('*')
        .eq('userId', userId)
        .eq('token', token) // Assuming tokens are stored as plain text. Hash and compare if they are hashed.
        .single();

    if (error) {
        throw new Error(error.message || 'validatePAT: An unexpected error occurred while validating the token');
    }

    if (!data) {
        throw new Error('validatePAT: No matching token found');
    }

    const currentTimestamp = new Date();
    const expiryTimestamp = new Date(data.expiresAt);

    if (expiryTimestamp < currentTimestamp) {
        const { error: deleteError } = await supabaseServiceRoleClient
            .from('userPats')
            .delete()
            .eq('id', data.id);

        if (deleteError) {
            throw new Error(deleteError.message || 'validatePAT: Failed to delete expired token');
        }

        throw new Error('validatePAT: Token is expired');
    }

    return true;
};




//
// User Balance Adjustments
//

export async function adjustUserBalance(
    userId: string, 
    adjustmentAmount: number
): Promise<boolean> {
    console.log("starting adjustUserBalance");
    try {
        const { data: user, error: fetchError } = await supabaseServiceRoleClient
            .from('userProfiles')
            .select('*')
            .eq('userId', userId)
            .single();

        if (fetchError || !user) {throw new Error(fetchError?.message || 'User not found');} 

        let newBalance = user.balance + adjustmentAmount;
        if (newBalance < 0) newBalance = 0;
        console.log("newBalance " + newBalance);

        const { error: updateError } = await supabaseServiceRoleClient
            .from('userProfiles')
            .update({ balance: newBalance })
            .eq('userId', userId);

        if (updateError) { throw new Error(updateError?.message || 'Failed to update balance');}

        // Fetch the user data again to verify the update
        const { data: updatedUser, error: verificationError } = await supabaseServiceRoleClient
            .from('userProfiles')
            .select('*')
            .eq('userId', userId)
            .single();

        if (verificationError || !updatedUser) { throw new Error(verificationError?.message || 'Failed to verify the updated balance');}

        return true;
    } catch (error) {
        throw new Error('adjustUserBalance: An unexpected error occurred');
    }
}


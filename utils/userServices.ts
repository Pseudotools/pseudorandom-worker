import { supabaseServiceRoleClient } from './supabaseClient';

import { UserPartial } from '../types/User';


// given a userId, return the corresponding UserPartial object
// 
export const getUserById = async (userId: string): Promise<UserPartial> => {
    const { data, error } = await supabaseServiceRoleClient
        .from('users')  // Replace 'users' with your actual users table name
        .select('email, userId, userSecret, balance, role')  // Selecting only the required fields
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

    console.log(`User ${userId} retrieved successfully.`);
    return data;
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
            .from('users')
            .select('*')
            .eq('userId', userId)
            .single();

        if (fetchError || !user) {throw new Error(fetchError?.message || 'User not found');} 

        let newBalance = user.balance + adjustmentAmount;
        if (newBalance < 0) newBalance = 0;
        console.log("newBalance " + newBalance);

        const { error: updateError } = await supabaseServiceRoleClient
            .from('users')
            .update({ balance: newBalance })
            .eq('userId', userId);

        if (updateError) { throw new Error(updateError?.message || 'Failed to update balance');}

        // Fetch the user data again to verify the update
        const { data: updatedUser, error: verificationError } = await supabaseServiceRoleClient
            .from('users')
            .select('*')
            .eq('userId', userId)
            .single();

        if (verificationError || !updatedUser) { throw new Error(verificationError?.message || 'Failed to verify the updated balance');}

        return true;
    } catch (error) {
        throw new Error('adjustUserBalance: An unexpected error occurred');
    }
}


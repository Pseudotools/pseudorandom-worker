import { supabaseServiceRoleClient } from './supabaseClient';
import { adjustUserBalance } from './userServices';
import { v4 as uuidv4 } from 'uuid';




export type ChargeCreationData = {
    chargeAmount: number;
    userId: string;
    subtype: 'semanticPredictionJob' | 'refinementPredictionJob' | 'error';
    description?: string;
}
export async function createChargeAndAdjustUserBalance(chargeData: ChargeCreationData): Promise<string> {
    console.log("Starting createChargeAndAdjustBalance");
    
    const { chargeAmount, userId, subtype, description } = chargeData;

    // Create a Charge transaction
    const transactionId = uuidv4();
    const charge: Charge = {
        transactionId: transactionId,
        userId: userId,
        createdAt: new Date(),
        amount: chargeAmount,
        description: description,
        type: 'charge',
        status: 'resolved',
        subtype: subtype
    };

    // Try to insert the Charge transaction into the database (assuming there's a 'transactions' table)
    // Note: Please modify this part as per your actual database operation method and table name
    const { data, error } = await supabaseServiceRoleClient
        .from('transactions')
        .insert([charge]);

    if (error) {
        console.error('Failed to insert the charge transaction into the database', error);
        throw error;
    }

    // Adjust the user's balance
    try {
        const adjustmentSuccessful = await adjustUserBalance(userId, -chargeAmount); // Subtracting chargeAmount from user's balance

        if (!adjustmentSuccessful) {
            console.error('Failed to adjust the user balance');
            throw new Error('Failed to adjust the user balance');
        }

        console.log('Charge transaction created and user balance adjusted successfully');
        return transactionId; // Return the transactionId of the created Charge transaction
    } catch (error) {
        console.error('An error occurred while adjusting user balance', error);

        // Update the transaction status to 'unresolved'
        try {
            const { error: updateError } = await supabaseServiceRoleClient
                .from('transactions')
                .update({ status: 'unresolved' })
                .eq('transactionId', transactionId);

            if (updateError) {
                console.error('Failed to update the transaction status to unresolved', updateError);
                throw new Error('Failed to update the transaction status to unresolved');
            }

            console.log('Transaction status updated to unresolved due to an error in adjusting user balance');
        } catch (updateStatusError) {
            console.error('An error occurred while updating the transaction status to unresolved', updateStatusError);
            throw updateStatusError; // Re-throw the error after logging it
        }

        throw error; // Re-throw the original error after handling the transaction status update
    }

}

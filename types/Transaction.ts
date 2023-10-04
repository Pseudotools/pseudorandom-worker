


interface Transaction {
    transactionId: string;
    userId: string;
    createdAt: Date;
    amount: number;
    description?: string;  // Optional description to provide additional details about the transaction
    type: 'charge' | 'credit';
    status: 'resolved' | 'unresolved' | 'flagged'; // 'resolved' is the default, 'unresolved' is used when there was an error updating the user's balance, 'flagged' is used to indicate that the transaction should be reviewed
}

interface Charge extends Transaction {
    type: 'charge';
    subtype: 'semanticPredictionJob' | 'refinementPredictionJob' | 'error';
}
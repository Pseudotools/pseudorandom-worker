

//
// Partial User
// describes values we know are present in database, and are needed dor Prediction handling
// there are other values in the database, but we don't need them.
// ANY CHANGES HERE should be reflecte in getUserById function
//
export type UserPartial = {
    email: string;
    userId: string;  // UUID as a string, set by Supabase
    userSecret: string;
    balance: number;
    role: 'admin' | 'og' | 'normie' | 'suspended'; // Add other roles as necessary
};




//
// UserProfile
// describes values we know are present in database, and are needed for Prediction handling
// ANY CHANGES HERE should be reflecte in getUserById function
//
export type UserProfile = {
    email: string;
    userId: string;  // UUID as a string, set by Supabase
    userSecret: string;
    balance: number;
    role: 'admin' | 'og' | 'normie' | 'suspended'; // Add other roles as necessary
};


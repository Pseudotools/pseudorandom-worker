

//
// Render
// Defines the structure of individual renders produced from a Prediction job.

export interface Render {
    renderId: string;  // Unique identifier for the individual render
    jobId: string;  // ID of the associated prediction job
    url: string;  // public URL of the generated image
    userId: string;  // ID of the user associated with the render
    createdAt: string;  // Timestamp indicating when the render was created
    type: 'error' | 'semantic' | 'refinement' ;  // Type of render, corresponds to the associated render job type
    width: number;  // Width of the image
    height: number; // Height of the image
}
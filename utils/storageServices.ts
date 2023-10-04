import { supabaseServiceRoleClient } from './supabaseClient';

import { Render } from '../types/Render';

// Supabase Storage constants
const semanticRenderBucketName = "semanticRenders"
const refinementRenderBucketName = "refinementRenders"

export async function postRemoteURLToStorage(imageUrl: string, imgType: string, guid: string): Promise<string> {
    try {
        let bucketName;

        switch (imgType) {
            case 'semantic':
                bucketName = semanticRenderBucketName;
                break;
            case 'refinement':
                bucketName = refinementRenderBucketName;
                break;
            default:
                throw new Error('Cannot post this Render type to storage: ' + imgType);
        }

        const fileName = `${guid}.png`;

        const response = await fetch(imageUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch the image: ${response.statusText}`);
        }

        if (!response.headers.get('content-type')?.startsWith('image')) {
            throw new Error('The content type is not an image');
        }

        const imageBuffer = await response.arrayBuffer();

        const { error: uploadError } = await supabaseServiceRoleClient.storage
            .from(bucketName)
            .upload(fileName, imageBuffer, {
                contentType: 'image/png',
            });

        if (uploadError) {
            throw new Error(`Failed to upload image to storage: ${uploadError.message}`);
        }

        const { data } = supabaseServiceRoleClient.storage
            .from(bucketName)
            .getPublicUrl(fileName);


        if (!data?.publicUrl) {
            throw new Error('Failed to retrieve public URL from storage');
        }

        return data.publicUrl;
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(error.message);
        } else {
            throw new Error('An unknown storage error occurred');
        }
    }
}

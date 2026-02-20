import { useMemo } from 'react';

/**
 * Generates a stable "wobbly" border-radius string.
 * The shape is generated once on mount (or when complexity changes) to avoid jitter.
 * 
 * @param {Object} options
 * @param {number} options.min - Minimum radius px (default: 2)
 * @param {number} options.max - Maximum radius px (default: 5)
 * @param {number} options.complexity - How "complex" the wobble is (not used in simple version, but good for API)
 * @returns {Object} - Style object with border-radius
 */
export function useWobbly({ min = 255, max = 15, seed = 0 } = {}) {
    // We actually want the "organic" blob look: 
    // border-radius: R1 R2 R3 R4 / R5 R6 R7 R8
    // Where values oscillate between high and low.

    // However, the "Hand-Drawn" spec suggests a specific pattern for consistent "wobbly" feel:
    // border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
    // Let's randomize it slightly around those large/small values to look like a hand-drawn loop.

    return useMemo(() => {
        const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

        // Large values (the "long" sides of the oval)
        const l1 = rand(220, 255);
        const l2 = rand(220, 255);
        const l3 = rand(220, 255);
        const l4 = rand(220, 255);

        // Small values (the "tight" corners)
        const s1 = rand(10, 20);
        const s2 = rand(10, 20);
        const s3 = rand(10, 20);
        const s4 = rand(10, 20);

        // Construct the 8-value syntax
        // This creates a generally rounded but irregular shape.
        // For a more "box with wobbly lines" feel, we might want smaller variations on a base radius.
        // But the prompt example: `255px 15px 225px 15px / 15px 225px 15px 255px` creates a very blobby shape.
        // If we want a button that looks like a drawn rectangle, we usually want:
        // top-left, top-right, bottom-right, bottom-left.
        // Let's try to generate a "drawn rectangle" radius which is subtle, 
        // vs a "drawn circle" which is drastic.

        // For general UI elements (buttons, inputs), we want "Drawn Rectangle":
        // border-radius: 2px 4px 3px 5px / 3px 5px 2px 4px
        // This makes the lines look non-straight.

        const r1 = rand(2, 6);
        const r2 = rand(2, 6);
        const r3 = rand(2, 6);
        const r4 = rand(2, 6);

        const r5 = rand(2, 6);
        const r6 = rand(2, 6);
        const r7 = rand(2, 6);
        const r8 = rand(2, 6);

        return {
            borderRadius: `${r1}% ${r2}% ${r3}% ${r4}% / ${r5}% ${r6}% ${r7}% ${r8}%`
            // Using % gives it that scalable drawn look. 
            // Low % (2-6%) makes it a rectangle with wobble.
            // High % would make it an oval.
        };
    }, []);
}

/**
 * Hook for a specific "Blob" shape (more extreme wobble)
 */
export function useBlob() {
    return useMemo(() => {
        const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
        const r1 = rand(30, 70);
        const r2 = rand(30, 70);
        const r3 = rand(30, 70);
        const r4 = rand(30, 70);
        const r5 = rand(30, 70);
        const r6 = rand(30, 70);
        const r7 = rand(30, 70);
        const r8 = rand(30, 70);
        return {
            borderRadius: `${r1}% ${r2}% ${r3}% ${r4}% / ${r5}% ${r6}% ${r7}% ${r8}%`
        };
    }, []);
}

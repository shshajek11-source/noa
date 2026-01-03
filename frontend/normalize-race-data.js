/**
 * Database Race Name Normalization Script
 *
 * This script normalizes all race_name values in the database to standard English format.
 * Converts Korean race names (천족, 마족) to English (Elyos, Asmodian).
 */

const SUPABASE_URL = 'https://mnbngmdjiszyowfvnzhk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYm5nbWRqaXN6eW93ZnZuemhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTY0ODAsImV4cCI6MjA4MjU3MjQ4MH0.AIvvGxd_iQKpQDbmOBoe4yAmii1IpB92Pp7Scs8Lz7U';

/**
 * Normalize race name to standard English format
 */
function normalizeRaceName(raceValue) {
    if (!raceValue) return 'Asmodian'; // Default fallback

    const normalized = raceValue.toString().toLowerCase().trim();

    // Check for Elyos variants
    if (normalized.includes('천족') ||
        normalized.includes('elyos') ||
        normalized === '0' ||
        normalized === '1') {
        return 'Elyos';
    }

    // Check for Asmodian variants
    if (normalized.includes('마족') ||
        normalized.includes('asmodian') ||
        normalized === '2') {
        return 'Asmodian';
    }

    console.warn(`Unknown race value: ${raceValue}, defaulting to Asmodian`);
    return 'Asmodian';
}

async function normalizeAllRaces() {
    console.log('Starting race name normalization...\n');

    try {
        // Step 1: Fetch all characters with their current race_name
        console.log('Step 1: Fetching all characters...');
        const fetchUrl = `${SUPABASE_URL}/rest/v1/characters?select=character_id,name,race_name,server_id&limit=10000`;

        const fetchResponse = await fetch(fetchUrl, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!fetchResponse.ok) {
            throw new Error(`Failed to fetch characters: ${fetchResponse.status} ${await fetchResponse.text()}`);
        }

        const characters = await fetchResponse.json();
        console.log(`✓ Fetched ${characters.length} characters\n`);

        // Step 2: Identify characters that need normalization
        console.log('Step 2: Analyzing race names...');
        const toUpdate = [];
        const stats = {
            alreadyNormalized: 0,
            needsUpdate: 0,
            천족ToElyos: 0,
            마족ToAsmodian: 0
        };

        for (const char of characters) {
            const currentRace = char.race_name;
            const normalizedRace = normalizeRaceName(currentRace);

            if (currentRace !== normalizedRace) {
                toUpdate.push({
                    character_id: char.character_id,
                    name: char.name,
                    server_id: char.server_id,
                    oldRace: currentRace,
                    newRace: normalizedRace
                });
                stats.needsUpdate++;

                if (currentRace === '천족') stats.천족ToElyos++;
                if (currentRace === '마족') stats.마족ToAsmodian++;
            } else {
                stats.alreadyNormalized++;
            }
        }

        console.log(`Analysis complete:`);
        console.log(`  - Already normalized: ${stats.alreadyNormalized}`);
        console.log(`  - Need update: ${stats.needsUpdate}`);
        console.log(`    - 천족 → Elyos: ${stats.천족ToElyos}`);
        console.log(`    - 마족 → Asmodian: ${stats.마족ToAsmodian}\n`);

        if (toUpdate.length === 0) {
            console.log('✓ All race names are already normalized!');
            return;
        }

        // Step 3: Update characters in batches
        console.log(`Step 3: Updating ${toUpdate.length} characters...`);
        const BATCH_SIZE = 100;
        let updated = 0;
        let errors = 0;

        for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
            const batch = toUpdate.slice(i, i + BATCH_SIZE);

            try {
                // Update each character in the batch
                for (const char of batch) {
                    const updateUrl = `${SUPABASE_URL}/rest/v1/characters?character_id=eq.${encodeURIComponent(char.character_id)}`;

                    const updateResponse = await fetch(updateUrl, {
                        method: 'PATCH',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                            race_name: char.newRace,
                            updated_at: new Date().toISOString()
                        })
                    });

                    if (updateResponse.ok) {
                        updated++;
                        process.stdout.write(`\rProgress: ${updated}/${toUpdate.length} (${Math.round(updated/toUpdate.length*100)}%)`);
                    } else {
                        errors++;
                        console.error(`\nError updating ${char.name}: ${updateResponse.status}`);
                    }
                }
            } catch (error) {
                console.error(`\nBatch error:`, error.message);
                errors += batch.length;
            }
        }

        console.log(`\n\nNormalization complete!`);
        console.log(`  ✓ Successfully updated: ${updated}`);
        if (errors > 0) {
            console.log(`  ✗ Errors: ${errors}`);
        }

        // Step 4: Verify the updates
        console.log('\nStep 4: Verifying updates...');
        const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/characters?select=race_name&limit=1000`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            const raceCount = {};
            verifyData.forEach(char => {
                raceCount[char.race_name] = (raceCount[char.race_name] || 0) + 1;
            });

            console.log('\nCurrent race distribution:');
            Object.entries(raceCount).forEach(([race, count]) => {
                console.log(`  - ${race}: ${count}`);
            });
        }

    } catch (error) {
        console.error('\n✗ Fatal error:', error);
        process.exit(1);
    }
}

// Run the script
normalizeAllRaces()
    .then(() => {
        console.log('\n✓ Script completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n✗ Script failed:', error);
        process.exit(1);
    });

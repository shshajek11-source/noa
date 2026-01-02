export interface RecentCharacter {
    id: string;          // server_id + '_' + character_name
    name: string;        // Character Name
    server: string;      // Server Name (e.g., Siel)
    serverId: number;    // Server ID
    race: string;        // Race (elyos/asmodian)
    class: string;       // Class Name
    level: number;       // Character Level
    itemLevel: number;   // Item Level (Combat Power-like metric)
    profileImage: string;// Profile Image URL
    timestamp: number;   // Timestamp for sorting
}

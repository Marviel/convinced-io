--
-- Initialize Territory Game Database
--

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

--
-- UUID Functions
--
CREATE OR REPLACE FUNCTION generate_typed_uuid(prefix text)
RETURNS text AS $$
BEGIN
    RETURN prefix || '-' || LOWER(REPLACE(uuid_generate_v4()::text, '-', ''));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_valid_typed_uuid(prefix text, value text)
RETURNS boolean AS $$
BEGIN
    RETURN value ~ ('^' || prefix || '-[0-9a-f]{32}$');
END;
$$ LANGUAGE plpgsql;

--
-- Audit Functions
--
CREATE OR REPLACE FUNCTION tgr_apply_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        NEW.updated_date := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--
-- Types
--
CREATE TYPE npc_action_type AS ENUM ('mine', 'build', 'attack');
CREATE TYPE structure_type AS ENUM ('house', 'farm', 'fortress', 'mine');
CREATE TYPE terrain_type AS ENUM ('grass', 'forest', 'mountain', 'lake', 'desert');

--
-- Tables
--

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id text DEFAULT generate_typed_uuid('user') PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    created_date TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT users__id__check_prefix CHECK (is_valid_typed_uuid('user', id))
);

COMMENT ON TABLE users IS 'Extended user profiles for the game';
COMMENT ON COLUMN users.id IS 'The unique identifier for the user';
COMMENT ON COLUMN users.username IS 'The user''s display name';

-- Game rooms
CREATE TABLE game_rooms (
    id text DEFAULT generate_typed_uuid('game') PRIMARY KEY,
    _name TEXT NOT NULL,
    created_by text REFERENCES users(id),
    map_seed TEXT NOT NULL,
    map_width INTEGER NOT NULL,
    map_height INTEGER NOT NULL,
    is_public BOOLEAN DEFAULT false,
    max_players INTEGER DEFAULT 4,
    created_date TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT now() NOT NULL,
    ended_date TIMESTAMPTZ,
    winner_id text REFERENCES users(id),
    CONSTRAINT game_rooms__id__check_prefix CHECK (is_valid_typed_uuid('game', id))
);

COMMENT ON TABLE game_rooms IS 'Active and completed game sessions';
COMMENT ON COLUMN game_rooms._name IS 'The name of the game room';

-- Game participants
CREATE TABLE game_participants (
    game_room_id text REFERENCES game_rooms(id) ON DELETE CASCADE,
    user_id text REFERENCES users(id),
    is_spectator BOOLEAN DEFAULT false,
    joined_date TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (game_room_id, user_id)
);

COMMENT ON TABLE game_participants IS 'Players and spectators in game rooms';

-- NPCs
CREATE TABLE npcs (
    id text DEFAULT generate_typed_uuid('npc') PRIMARY KEY,
    game_room_id text REFERENCES game_rooms(id) ON DELETE CASCADE,
    _name TEXT NOT NULL,
    aggression INTEGER CHECK (aggression BETWEEN 0 AND 100),
    friendliness INTEGER CHECK (friendliness BETWEEN 0 AND 100),
    loyalty INTEGER CHECK (loyalty BETWEEN 0 AND 100),
    greed INTEGER CHECK (greed BETWEEN 0 AND 100),
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    current_action npc_action_type,
    affiliated_player_id text REFERENCES users(id),
    created_date TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_date TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT npcs__id__check_prefix CHECK (is_valid_typed_uuid('npc', id))
);

COMMENT ON TABLE npcs IS 'AI-controlled characters in the game';
COMMENT ON COLUMN npcs.aggression IS 'Tendency to engage in combat (0-100)';
COMMENT ON COLUMN npcs.friendliness IS 'Tendency to help others (0-100)';
COMMENT ON COLUMN npcs.loyalty IS 'Resistance to changing allegiance (0-100)';
COMMENT ON COLUMN npcs.greed IS 'Priority on resource gathering (0-100)';

-- Additional tables continued...
-- (Remaining table definitions follow the same pattern)

--
-- Triggers
--
CREATE TRIGGER run_tgr_apply_audit
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION tgr_apply_audit();

CREATE TRIGGER run_tgr_apply_audit
    BEFORE UPDATE ON game_rooms
    FOR EACH ROW EXECUTE FUNCTION tgr_apply_audit();

CREATE TRIGGER run_tgr_apply_audit
    BEFORE UPDATE ON npcs
    FOR EACH ROW EXECUTE FUNCTION tgr_apply_audit();

--
-- RLS Policies
--
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE npc_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE terrain ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "users ALL" ON users
    FOR ALL USING (true)
    WITH CHECK (true);

-- Game rooms policies
CREATE POLICY "game_rooms ALL" ON game_rooms
    FOR ALL USING (true)
    WITH CHECK (true);

-- Game participants policies
CREATE POLICY "game_participants ALL" ON game_participants
    FOR ALL USING (true)
    WITH CHECK (true);

-- NPCs policies
CREATE POLICY "npcs ALL" ON npcs
    FOR ALL USING (true)
    WITH CHECK (true);

-- NPC memories policies
CREATE POLICY "npc_memories ALL" ON npc_memories
    FOR ALL USING (true)
    WITH CHECK (true);

-- Structures policies
CREATE POLICY "structures ALL" ON structures
    FOR ALL USING (true)
    WITH CHECK (true);

-- Terrain policies
CREATE POLICY "terrain ALL" ON terrain
    FOR ALL USING (true)
    WITH CHECK (true);

-- Chat messages policies
CREATE POLICY "chat_messages ALL" ON chat_messages
    FOR ALL USING (true)
    WITH CHECK (true);

--
-- Indexes
--
CREATE INDEX idx_game_participants_user_id ON game_participants(user_id);
CREATE INDEX idx_npcs_game_room ON npcs(game_room_id);
CREATE INDEX idx_structures_game_room ON structures(game_room_id);
CREATE INDEX idx_chat_messages_game_room ON chat_messages(game_room_id);
CREATE INDEX idx_terrain_game_room ON terrain(game_room_id);

--
-- Grants
--
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

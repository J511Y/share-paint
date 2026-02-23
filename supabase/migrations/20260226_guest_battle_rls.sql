-- Enable guest writes for battle creation/join flow while preserving authenticated constraints.

DROP POLICY IF EXISTS "Users can create battles" ON battles;
CREATE POLICY "Users can create battles"
  ON battles
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = host_id)
    OR (auth.uid() IS NULL AND host_id IS NULL AND host_guest_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Users can join battles" ON battle_participants;
CREATE POLICY "Users can join battles"
  ON battle_participants
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL AND guest_id IS NOT NULL)
  );

-- seed.sql · Configuração inicial REAL (sem participantes ou dados fictícios).
-- Execute depois das migrations. Pode ser reexecutado com segurança.

insert into public.activity_categories (name, points, min_duration_minutes, icon) values
  ('Musculação',   1, 30, 'dumbbell'),
  ('Corrida',      1, 15, 'footprints'),
  ('Caminhada',    1, 30, 'footprints'),
  ('Bicicleta',    1, 30, 'bike'),
  ('Natação',      1, 20, 'waves'),
  ('Funcional',    1, 20, 'flame'),
  ('Futebol',      1, 20, 'circle'),
  ('Vôlei',        1, 20, 'circle'),
  ('Basquete',     1, 20, 'circle'),
  ('Pular corda',  1, 15, 'activity'),
  ('Pilates',      1, 20, 'activity'),
  ('Dança',        1, 20, 'music')
on conflict (name) where challenge_id is null do nothing;

insert into public.achievements (code, title, description, icon, sort_order) values
  ('first_activity',    'Primeiro passo',     'Registre sua primeira atividade aprovada.',       'medal',   1),
  ('first_run',         'Primeira corrida',   'Tenha uma corrida aprovada.',                     'medal',   2),
  ('active_days_5',     'Em movimento',       'Tenha atividades aprovadas em 5 dias diferentes.','calendar',3),
  ('activities_10',     'Dez treinos',        'Acumule 10 atividades aprovadas.',                'trophy',  4),
  ('points_20',         'Vinte pontos',       'Acumule 20 pontos aprovados.',                    'star',    5),
  ('streak_3',          'Sequência de 3',     'Treine 3 dias consecutivos.',                     'flame',   6),
  ('weekly_champion',   'Campeão da semana',  'Vença um ranking semanal.',                       'crown',   7),
  ('monthly_champion',  'Campeão do mês',     'Vença um ranking mensal.',                        'crown',   8)
on conflict (code) do nothing;

-- 0014 · Catálogo inicial de exercícios (112), em pt-BR.
-- GERADO por scripts/build-exercise-catalog.mjs a partir de db/data/exercises/*.json — não edite à mão.
-- Textos: free-exercise-db (Unlicense, domínio público), traduzidos e adaptados; "own" = escritos para o app.
-- Idempotente e não destrutivo: exercício que já existe (mesmo slug ou nome) fica como está.

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('flexao-de-braco', 'Flexão de braço', 'Pushups', 'chest', 'body_weight', 'beginner', 'compound', 'strength', array['Apoie as mãos no chão um pouco mais abertas que a largura dos ombros.', 'Estenda as pernas e apoie as pontas dos pés, formando uma linha reta da cabeça aos calcanhares.', 'Desça o corpo dobrando os cotovelos até o peito quase encostar no chão.', 'Faça uma breve pausa embaixo.', 'Empurre o chão e estenda os braços até voltar à posição inicial.']::text[], array['Deixar o quadril cair ou ficar empinado.', 'Abrir demais os cotovelos, em linha com os ombros.', 'Fazer só metade do movimento, sem descer o peito.']::text[], array['Contraia o abdômen e os glúteos para manter o corpo alinhado.', 'Mantenha os cotovelos a cerca de 45 graus do tronco.', 'Puxe o ar ao descer e solte ao empurrar.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['front_delts', 'triceps', 'abs']::text[]) as m
 where e.slug = 'flexao-de-braco' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('flexao-militar', 'Flexão militar (cotovelos colados)', 'Push-Ups - Close Triceps Position', 'triceps', 'body_weight', 'intermediate', 'compound', 'strength', array['Apoie as mãos no chão na largura dos ombros, logo abaixo do peito.', 'Estenda as pernas e apoie as pontas dos pés, com o corpo reto.', 'Desça o corpo mantendo os cotovelos colados ao tronco e apontando para trás.', 'Desça até o peito ficar perto do chão.', 'Empurre o chão e estenda os braços, mantendo os cotovelos junto ao corpo.']::text[], array['Deixar os cotovelos abrirem para os lados durante a descida.', 'Deixar o quadril cair ou subir demais.', 'Encurtar a amplitude para conseguir mais repetições.']::text[], array['Pense em raspar os cotovelos nas costelas durante todo o movimento.', 'Mantenha o abdômen firme para não arquear a lombar.', 'Puxe o ar ao descer e solte ao empurrar.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['chest', 'front_delts']::text[]) as m
 where e.slug = 'flexao-militar' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('supino-reto-com-barra', 'Supino reto com barra', 'Barbell Bench Press - Medium Grip', 'chest', 'barbell', 'beginner', 'compound', 'strength', array['Deite no banco reto com os pés firmes no chão e os olhos abaixo da barra.', 'Segure a barra com as mãos um pouco mais abertas que os ombros.', 'Tire a barra do suporte e posicione-a acima do peito com os braços estendidos.', 'Desça a barra devagar até tocar levemente a parte média do peito.', 'Faça uma breve pausa e empurre a barra de volta até estender os braços.', 'Ao terminar a série, devolva a barra ao suporte com controle.']::text[], array['Tirar o quadril do banco ao empurrar.', 'Quicar a barra no peito.', 'Abrir os cotovelos a 90 graus do tronco.', 'Deixar os punhos dobrados para trás.']::text[], array['Junte as escápulas e mantenha-as firmes no banco durante a série.', 'Mantenha os punhos alinhados com os antebraços.', 'Puxe o ar ao descer e solte ao empurrar.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['front_delts', 'triceps']::text[]) as m
 where e.slug = 'supino-reto-com-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('supino-inclinado-com-halteres', 'Supino inclinado com halteres', 'Incline Dumbbell Press', 'chest', 'dumbbell', 'beginner', 'compound', 'strength', array['Ajuste o banco com inclinação entre 30 e 45 graus.', 'Sente com um halter em cada mão apoiado nas coxas e deite levando os halteres à altura do peito.', 'Posicione os halteres ao lado do peito, com as palmas voltadas para a frente.', 'Empurre os halteres para cima até estender os braços, aproximando-os no alto.', 'Desça devagar até os halteres ficarem na altura do peito.', 'Repita mantendo as costas apoiadas no banco.']::text[], array['Usar inclinação alta demais, transferindo o trabalho para os ombros.', 'Bater os halteres no alto do movimento.', 'Descer rápido demais e perder o controle da carga.']::text[], array['Mantenha as escápulas juntas e o peito aberto.', 'Controle a descida em cerca de dois segundos.', 'Solte o ar ao empurrar e puxe ao descer.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['front_delts', 'triceps']::text[]) as m
 where e.slug = 'supino-inclinado-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('supino-reto-com-halteres', 'Supino reto com halteres', 'Dumbbell Bench Press', 'chest', 'dumbbell', 'beginner', 'compound', 'strength', array['Sente na ponta do banco reto com os halteres apoiados nas coxas.', 'Deite levando os halteres junto ao peito com ajuda das coxas.', 'Posicione os halteres ao lado do peito, com as palmas voltadas para a frente.', 'Empurre os halteres para cima até estender os braços.', 'Desça devagar até os halteres chegarem ao lado do peito.', 'Repita mantendo os pés firmes no chão.']::text[], array['Deixar os halteres descerem desalinhados, um mais baixo que o outro.', 'Tirar o quadril do banco ao empurrar.', 'Travar os cotovelos com força no alto.']::text[], array['Mantenha as escápulas juntas e apoiadas no banco.', 'Deixe os cotovelos levemente abaixo da linha dos ombros.', 'Solte o ar ao empurrar e puxe ao descer.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['front_delts', 'triceps']::text[]) as m
 where e.slug = 'supino-reto-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('supino-declinado-com-barra', 'Supino declinado com barra', 'Decline Barbell Bench Press', 'chest', 'barbell', 'beginner', 'compound', 'strength', array['Deite no banco declinado e prenda as pernas no apoio.', 'Segure a barra com as mãos um pouco mais abertas que os ombros.', 'Tire a barra do suporte e posicione-a acima do peito com os braços estendidos.', 'Desça a barra devagar até tocar a parte baixa do peito.', 'Empurre a barra de volta até estender os braços.', 'Ao terminar, devolva a barra ao suporte com controle.']::text[], array['Descer a barra em direção ao pescoço.', 'Quicar a barra no peito.', 'Fazer o exercício sem ajuda com cargas altas.']::text[], array['Peça ajuda para tirar e devolver a barra ao suporte.', 'Mantenha as escápulas juntas durante toda a série.', 'Puxe o ar ao descer e solte ao empurrar.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['triceps', 'front_delts']::text[]) as m
 where e.slug = 'supino-declinado-com-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('supino-inclinado-com-barra', 'Supino inclinado com barra', 'Barbell Incline Bench Press - Medium Grip', 'chest', 'barbell', 'beginner', 'compound', 'strength', array['Deite no banco inclinado com os pés firmes no chão.', 'Segure a barra com as mãos um pouco mais abertas que os ombros.', 'Tire a barra do suporte e posicione-a acima da parte alta do peito.', 'Desça a barra devagar até tocar a parte alta do peito.', 'Empurre a barra de volta até estender os braços.', 'Ao terminar, devolva a barra ao suporte com controle.']::text[], array['Descer a barra na parte baixa do peito.', 'Arquear demais a lombar e tirar o quadril do banco.', 'Abrir os cotovelos totalmente para os lados.']::text[], array['Mantenha as escápulas juntas e o peito aberto.', 'Controle a descida e evite quicar a barra.', 'Puxe o ar ao descer e solte ao empurrar.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['front_delts', 'triceps']::text[]) as m
 where e.slug = 'supino-inclinado-com-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('crucifixo-reto-com-halteres', 'Crucifixo reto com halteres', 'Dumbbell Flyes', 'chest', 'dumbbell', 'beginner', 'isolation', 'strength', array['Deite no banco reto com um halter em cada mão.', 'Estenda os braços acima do peito, com as palmas voltadas uma para a outra.', 'Dobre levemente os cotovelos e mantenha esse ângulo durante todo o movimento.', 'Abra os braços em arco para os lados até sentir o peito alongar.', 'Volte pelo mesmo arco, aproximando os halteres acima do peito.']::text[], array['Dobrar e estender os cotovelos, transformando o exercício em supino.', 'Descer os braços muito abaixo da linha do tronco.', 'Usar carga alta demais e perder o controle.']::text[], array['Pense em abraçar uma árvore ao subir os halteres.', 'Mantenha as escápulas juntas e o peito aberto.', 'Puxe o ar ao abrir os braços e solte ao fechar.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['front_delts']::text[]) as m
 where e.slug = 'crucifixo-reto-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('crucifixo-inclinado-com-halteres', 'Crucifixo inclinado com halteres', 'Incline Dumbbell Flyes', 'chest', 'dumbbell', 'beginner', 'isolation', 'strength', array['Ajuste o banco com inclinação entre 30 e 45 graus e deite com um halter em cada mão.', 'Estenda os braços acima do peito, com as palmas voltadas uma para a outra.', 'Dobre levemente os cotovelos e mantenha esse ângulo.', 'Abra os braços em arco para os lados até sentir o peito alongar.', 'Volte pelo mesmo arco, aproximando os halteres acima do peito.']::text[], array['Dobrar demais os cotovelos e empurrar a carga como num supino.', 'Descer os halteres além do ponto confortável para os ombros.', 'Tirar as costas do banco.']::text[], array['Movimente apenas os ombros, mantendo os cotovelos fixos.', 'Controle bem a descida.', 'Puxe o ar ao abrir os braços e solte ao fechar.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['front_delts']::text[]) as m
 where e.slug = 'crucifixo-inclinado-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('voador-polia-alta', 'Voador na polia alta (crossover)', 'Cable Crossover', 'chest', 'cable', 'beginner', 'isolation', 'strength', array['Ajuste as duas polias na posição alta e segure uma pegada em cada mão.', 'Dê um passo à frente, com um pé à frente do outro, e incline levemente o tronco.', 'Abra os braços com os cotovelos levemente dobrados, sentindo o peito alongar.', 'Puxe as pegadas em arco para baixo e para a frente até as mãos se encontrarem na frente do corpo.', 'Segure a contração por um segundo.', 'Volte devagar pelo mesmo arco até a posição inicial.']::text[], array['Dobrar e estender os cotovelos durante o movimento.', 'Usar o peso do corpo para puxar os cabos.', 'Deixar os cabos voltarem rápido, sem controle.']::text[], array['Mantenha o tronco firme e o peito aberto.', 'Mantenha o mesmo ângulo dos cotovelos do início ao fim.', 'Solte o ar ao fechar os braços e puxe ao abrir.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['front_delts']::text[]) as m
 where e.slug = 'voador-polia-alta' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('voador-maquina', 'Voador na máquina (peck deck)', 'Butterfly', 'chest', 'machine', 'beginner', 'isolation', 'strength', array['Ajuste o banco para que os braços fiquem paralelos ao chão ao segurar as pegadas.', 'Sente com as costas apoiadas no encosto e segure as pegadas.', 'Aproxime as pegadas na frente do corpo, contraindo o peito.', 'Segure a contração por um segundo.', 'Volte devagar até sentir o peito alongar.']::text[], array['Tirar as costas do encosto ao fechar os braços.', 'Deixar a carga voltar rápido e bater os pesos.', 'Ajustar o banco alto ou baixo demais.']::text[], array['Mantenha os ombros para baixo e para trás.', 'Controle a volta tanto quanto a ida.', 'Solte o ar ao fechar os braços e puxe ao abrir.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['front_delts']::text[]) as m
 where e.slug = 'voador-maquina' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('paralelas-peitoral', 'Paralelas (foco no peitoral)', 'Dips - Chest Version', 'chest', 'body_weight', 'intermediate', 'compound', 'strength', array['Segure as barras paralelas e suba até ficar com os braços estendidos.', 'Incline o tronco cerca de 30 graus para a frente.', 'Desça devagar dobrando os cotovelos, levemente abertos, até sentir o peito alongar.', 'Empurre as barras e estenda os braços até voltar à posição inicial.', 'Contraia o peito por um segundo no alto.']::text[], array['Manter o tronco totalmente reto, tirando o foco do peitoral.', 'Descer demais e forçar os ombros.', 'Balançar as pernas para ganhar impulso.']::text[], array['Mantenha os ombros longe das orelhas durante todo o movimento.', 'Desça só até onde consegue manter o controle.', 'Puxe o ar ao descer e solte ao subir.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['triceps', 'front_delts']::text[]) as m
 where e.slug = 'paralelas-peitoral' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('elevacao-lateral-com-halteres', 'Elevação lateral com halteres', 'Side Lateral Raise', 'side_delts', 'dumbbell', 'beginner', 'isolation', 'strength', array['Fique em pé com um halter em cada mão, braços ao lado do corpo e palmas voltadas para dentro.', 'Dobre levemente os cotovelos e incline o tronco um pouco à frente.', 'Eleve os braços para os lados até a altura dos ombros.', 'Faça uma breve pausa no alto.', 'Desça os halteres devagar até a posição inicial.']::text[], array['Balançar o tronco para subir a carga.', 'Subir os halteres acima da altura dos ombros.', 'Encolher os ombros durante a subida.']::text[], array['Pense em levar os halteres para longe, e não para cima.', 'Mantenha os cotovelos um pouco acima das mãos no alto.', 'Solte o ar ao subir e puxe ao descer.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['traps']::text[]) as m
 where e.slug = 'elevacao-lateral-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('elevacao-frontal-com-halteres', 'Elevação frontal com halteres', 'Front Dumbbell Raise', 'front_delts', 'dumbbell', 'beginner', 'isolation', 'strength', array['Fique em pé com um halter em cada mão à frente das coxas, palmas voltadas para o corpo.', 'Mantenha o tronco firme e os cotovelos levemente dobrados.', 'Eleve um ou os dois braços à frente até a altura dos ombros.', 'Faça uma breve pausa no alto.', 'Desça os halteres devagar até a posição inicial.']::text[], array['Jogar o tronco para trás para subir a carga.', 'Subir os halteres muito acima da linha dos ombros.', 'Descer os halteres sem controle.']::text[], array['Contraia o abdômen para manter o tronco parado.', 'Use uma carga que permita subir sem impulso.', 'Solte o ar ao subir e puxe ao descer.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['side_delts', 'chest']::text[]) as m
 where e.slug = 'elevacao-frontal-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('crucifixo-invertido-com-halteres', 'Crucifixo invertido com halteres', 'Reverse Flyes', 'rear_delts', 'dumbbell', 'beginner', 'isolation', 'strength', array['Segure um halter em cada mão e incline o tronco à frente, quase paralelo ao chão, com os joelhos levemente dobrados.', 'Deixe os braços pendurados abaixo do peito, com as palmas voltadas uma para a outra.', 'Dobre levemente os cotovelos e mantenha esse ângulo.', 'Abra os braços para os lados até a altura dos ombros.', 'Desça os halteres devagar até a posição inicial.']::text[], array['Arredondar as costas durante o movimento.', 'Levantar o tronco para ajudar a subir a carga.', 'Juntar demais as escápulas e transformar o exercício em remada.']::text[], array['Mantenha a coluna neutra e o pescoço alinhado.', 'Pense em levar os halteres para os lados, e não para trás.', 'Solte o ar ao abrir os braços e puxe ao descer.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['middle_back', 'traps']::text[]) as m
 where e.slug = 'crucifixo-invertido-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('desenvolvimento-com-halteres', 'Desenvolvimento com halteres', 'Dumbbell Shoulder Press', 'front_delts', 'dumbbell', 'intermediate', 'compound', 'strength', array['Sente em um banco com encosto, com um halter em cada mão apoiado nas coxas.', 'Leve os halteres até a altura dos ombros, com as palmas voltadas para a frente.', 'Empurre os halteres para cima até estender os braços.', 'Faça uma breve pausa no alto.', 'Desça devagar até os halteres voltarem à altura dos ombros.']::text[], array['Arquear demais a lombar ao empurrar.', 'Descer os halteres só até a metade.', 'Bater os halteres no alto do movimento.']::text[], array['Mantenha as costas apoiadas no encosto e o abdômen firme.', 'Deixe os cotovelos levemente à frente do corpo.', 'Solte o ar ao empurrar e puxe ao descer.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['side_delts', 'triceps']::text[]) as m
 where e.slug = 'desenvolvimento-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('desenvolvimento-militar-com-barra-em-pe', 'Desenvolvimento militar com barra em pé', 'Standing Military Press', 'front_delts', 'barbell', 'beginner', 'compound', 'strength', array['Ajuste a barra no suporte na altura do peito.', 'Segure a barra com as mãos um pouco mais abertas que os ombros, palmas para a frente.', 'Tire a barra do suporte e apoie-a na frente dos ombros, com os pés na largura do quadril.', 'Empurre a barra para cima até estender os braços, passando-a próxima ao rosto.', 'Desça a barra devagar até a frente dos ombros.']::text[], array['Inclinar o tronco para trás e arquear a lombar.', 'Empurrar a barra para a frente, longe do corpo.', 'Dobrar os joelhos para ganhar impulso.']::text[], array['Contraia o abdômen e os glúteos durante toda a série.', 'Afaste levemente a cabeça para a barra passar e volte-a ao lugar no alto.', 'Solte o ar ao empurrar e puxe ao descer.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['side_delts', 'triceps', 'abs']::text[]) as m
 where e.slug = 'desenvolvimento-militar-com-barra-em-pe' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('desenvolvimento-na-maquina', 'Desenvolvimento na máquina', 'Machine Shoulder (Military) Press', 'front_delts', 'machine', 'beginner', 'compound', 'strength', array['Ajuste o banco para que as pegadas fiquem na altura dos ombros.', 'Sente com as costas apoiadas no encosto e segure as pegadas.', 'Empurre as pegadas para cima até estender os braços.', 'Faça uma breve pausa no alto.', 'Desça devagar até as mãos voltarem à altura dos ombros.']::text[], array['Tirar as costas do encosto ao empurrar.', 'Travar os cotovelos com força no alto.', 'Deixar o peso bater ao descer.']::text[], array['Mantenha os ombros para baixo, longe das orelhas.', 'Controle a descida em cerca de dois segundos.', 'Solte o ar ao empurrar e puxe ao descer.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['side_delts', 'triceps']::text[]) as m
 where e.slug = 'desenvolvimento-na-maquina' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('desenvolvimento-arnold', 'Desenvolvimento Arnold', 'Arnold Dumbbell Press', 'front_delts', 'dumbbell', 'intermediate', 'compound', 'strength', array['Sente em um banco com encosto, com um halter em cada mão.', 'Segure os halteres na frente do peito, na altura do queixo, com as palmas voltadas para você.', 'Empurre os halteres para cima girando os punhos até as palmas ficarem voltadas para a frente.', 'Estenda os braços no alto e faça uma breve pausa.', 'Desça girando os punhos de volta até a posição inicial.']::text[], array['Separar o giro da subida, fazendo dois movimentos.', 'Arquear a lombar ao empurrar.', 'Usar carga alta demais e perder o controle do giro.']::text[], array['Faça o giro de forma suave e contínua durante a subida.', 'Mantenha o abdômen firme e as costas apoiadas.', 'Solte o ar ao empurrar e puxe ao descer.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['side_delts', 'triceps']::text[]) as m
 where e.slug = 'desenvolvimento-arnold' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('face-pull-na-polia', 'Face pull na polia', 'Face Pull', 'rear_delts', 'cable', 'intermediate', 'compound', 'strength', array['Prenda uma corda na polia ajustada na altura do rosto.', 'Segure as pontas da corda com as palmas voltadas uma para a outra e dê alguns passos para trás.', 'Estenda os braços à frente, mantendo o tronco firme.', 'Puxe a corda em direção ao rosto, afastando as mãos e levando os cotovelos para os lados.', 'Faça uma breve pausa, juntando as escápulas.', 'Volte devagar até estender os braços.']::text[], array['Puxar com os cotovelos baixos, como numa remada.', 'Inclinar o tronco para trás para ajudar a puxar.', 'Usar carga alta demais e encurtar o movimento.']::text[], array['Mantenha os cotovelos na altura dos ombros ou um pouco acima.', 'Use carga leve e foque na contração dos ombros.', 'Solte o ar ao puxar e puxe o ar ao voltar.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['middle_back', 'traps']::text[]) as m
 where e.slug = 'face-pull-na-polia' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('crucifixo-invertido-na-polia', 'Crucifixo invertido na polia', 'Cable Rear Delt Fly', 'rear_delts', 'cable', 'beginner', 'isolation', 'strength', array['Ajuste as duas polias na altura dos ombros, sem pegadas, segurando a ponta dos cabos.', 'Segure o cabo da esquerda com a mão direita e o da direita com a mão esquerda, cruzando os braços à frente.', 'Fique no centro, com os braços estendidos à frente na altura dos ombros.', 'Abra os braços para os lados e para trás, mantendo-os estendidos.', 'Faça uma breve pausa quando os braços ficarem alinhados com o corpo.', 'Volte devagar até a posição inicial.']::text[], array['Dobrar os cotovelos e transformar o movimento em remada.', 'Inclinar o tronco para trás.', 'Encolher os ombros durante o movimento.']::text[], array['Mantenha os ombros para baixo e o peito aberto.', 'Use carga leve e movimento controlado.', 'Solte o ar ao abrir os braços e puxe ao voltar.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['middle_back', 'traps']::text[]) as m
 where e.slug = 'crucifixo-invertido-na-polia' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('remada-alta-com-barra', 'Remada alta com barra', 'Upright Barbell Row', 'side_delts', 'barbell', 'beginner', 'compound', 'strength', array['Fique em pé segurando a barra à frente das coxas, com as mãos um pouco mais fechadas que os ombros.', 'Mantenha as costas retas e os braços estendidos.', 'Puxe a barra para cima, próxima ao corpo, levando os cotovelos para os lados.', 'Suba até os cotovelos ficarem na altura dos ombros.', 'Faça uma breve pausa e desça a barra devagar.']::text[], array['Subir os cotovelos muito acima da linha dos ombros.', 'Usar pegada muito fechada e forçar os punhos.', 'Balançar o tronco para subir a carga.']::text[], array['Deixe os cotovelos sempre acima das mãos.', 'Mantenha a barra próxima ao corpo durante todo o movimento.', 'Solte o ar ao subir e puxe ao descer.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['traps', 'front_delts', 'biceps']::text[]) as m
 where e.slug = 'remada-alta-com-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('crucifixo-invertido-sentado-polia-baixa', 'Crucifixo invertido sentado na polia baixa', 'Cable Seated Lateral Raise', 'rear_delts', 'cable', 'beginner', 'isolation', 'strength', array['Posicione um banco entre duas polias baixas e sente na ponta, com os pés à frente dos joelhos.', 'Incline o tronco à frente com as costas retas, apoiando o peito sobre as coxas.', 'Segure o cabo da esquerda com a mão direita e o da direita com a mão esquerda, passando os cabos por baixo dos joelhos.', 'Com os cotovelos levemente dobrados, abra os braços para os lados até a altura dos ombros.', 'Segure a contração por um segundo.', 'Desça os braços devagar até a posição inicial.']::text[], array['Levantar o tronco das coxas para ajudar a puxar.', 'Dobrar e estender os cotovelos durante o movimento.', 'Usar carga alta demais e encurtar a amplitude.']::text[], array['Mantenha os braços perpendiculares ao tronco ao subir.', 'Mantenha o pescoço alinhado com a coluna.', 'Solte o ar ao abrir os braços e puxe ao descer.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['middle_back', 'traps']::text[]) as m
 where e.slug = 'crucifixo-invertido-sentado-polia-baixa' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('elevacao-lateral-com-elastico', 'Elevação lateral com elástico', 'Lateral Raise - With Bands', 'side_delts', 'band', 'beginner', 'isolation', 'strength', array['Pise no meio do elástico de forma que ele já tenha tensão com os braços estendidos.', 'Segure as pontas ao lado das coxas, com as palmas voltadas para o corpo.', 'Dobre levemente os cotovelos e mantenha as costas retas.', 'Eleve os braços para os lados até um pouco acima da altura dos ombros.', 'Faça uma breve pausa no alto.', 'Desça os braços devagar até a posição inicial.']::text[], array['Balançar o tronco para subir os braços.', 'Encolher os ombros durante a subida.', 'Deixar o elástico puxar os braços de volta sem controle.']::text[], array['Mantenha o tronco parado e o abdômen firme.', 'Ajuste a posição dos pés para mudar a tensão do elástico.', 'Solte o ar ao subir e puxe ao descer.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['traps']::text[]) as m
 where e.slug = 'elevacao-lateral-com-elastico' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('abertura-de-bracos-com-elastico', 'Abertura de braços com elástico', 'Band Pull Apart', 'rear_delts', 'band', 'beginner', 'isolation', 'strength', array['Fique em pé segurando o elástico com as duas mãos, braços estendidos à frente na altura dos ombros.', 'Mantenha os ombros para trás e o peito aberto.', 'Abra os braços para os lados, mantendo os cotovelos estendidos.', 'Leve o elástico até perto do peito.', 'Faça uma breve pausa e volte devagar à posição inicial.']::text[], array['Dobrar os cotovelos durante a abertura.', 'Arquear a lombar para conseguir abrir os braços.', 'Encolher os ombros em direção às orelhas.']::text[], array['Escolha um elástico que permita abrir os braços por completo.', 'Junte as escápulas no fim do movimento.', 'Solte o ar ao abrir os braços e puxe ao voltar.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['middle_back', 'traps']::text[]) as m
 where e.slug = 'abertura-de-bracos-com-elastico' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('encolhimento-com-barra', 'Encolhimento com barra', 'Barbell Shrug', 'traps', 'barbell', 'beginner', 'isolation', 'strength', array['Fique em pé segurando a barra à frente das coxas, mãos na largura dos ombros e palmas voltadas para o corpo.', 'Mantenha os braços estendidos e as costas retas.', 'Eleve os ombros o máximo possível em direção às orelhas.', 'Segure a contração por um segundo.', 'Desça os ombros devagar até a posição inicial.']::text[], array['Girar os ombros em círculo durante o movimento.', 'Dobrar os cotovelos para ajudar a subir a carga.', 'Projetar a cabeça para a frente.']::text[], array['Mantenha os braços relaxados e estendidos, como ganchos.', 'Faça o movimento só para cima e para baixo.', 'Solte o ar ao subir os ombros e puxe ao descer.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['forearms']::text[]) as m
 where e.slug = 'encolhimento-com-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('encolhimento-com-halteres', 'Encolhimento com halteres', 'Dumbbell Shrug', 'traps', 'dumbbell', 'beginner', 'isolation', 'strength', array['Fique em pé com um halter em cada mão ao lado do corpo, palmas voltadas para dentro.', 'Mantenha os braços estendidos e as costas retas.', 'Eleve os ombros o máximo possível em direção às orelhas.', 'Segure a contração por um segundo.', 'Desça os ombros devagar até a posição inicial.']::text[], array['Girar os ombros em círculo durante o movimento.', 'Dobrar os cotovelos para ajudar a subir a carga.', 'Usar carga alta demais e encurtar a amplitude.']::text[], array['Mantenha o pescoço alinhado e o olhar à frente.', 'Faça o movimento só para cima e para baixo.', 'Solte o ar ao subir os ombros e puxe ao descer.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['forearms']::text[]) as m
 where e.slug = 'encolhimento-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('biceps-martelo', 'Bíceps martelo', 'Hammer Curls', 'biceps', 'dumbbell', 'beginner', 'isolation', 'strength', array['Fique em pé com o tronco ereto e um halter em cada mão, braços estendidos ao lado do corpo.', 'Mantenha as palmas das mãos voltadas para o corpo e os cotovelos próximos ao tronco.', 'Sem mover a parte de cima dos braços, suba os halteres dobrando os cotovelos até a altura dos ombros.', 'Segure a contração por um instante, apertando o bíceps.', 'Desça os halteres devagar até estender os braços.']::text[], array['Afastar os cotovelos do tronco durante a subida.', 'Balançar o corpo para ganhar impulso.', 'Girar o punho e perder a pegada neutra.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha o abdome firme e os ombros parados.', 'Controle a descida, sem deixar o peso cair.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['forearms']::text[]) as m
 where e.slug = 'biceps-martelo' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('rosca-direta-com-barra', 'Rosca direta com barra', 'Barbell Curl', 'biceps', 'barbell', 'beginner', 'isolation', 'strength', array['Fique em pé com o tronco ereto segurando a barra com as mãos na largura dos ombros.', 'Deixe as palmas voltadas para a frente e os cotovelos junto ao tronco.', 'Sem mover a parte de cima dos braços, suba a barra dobrando os cotovelos.', 'Continue até a barra chegar perto dos ombros e aperte o bíceps por um segundo.', 'Desça a barra devagar até estender os braços.']::text[], array['Jogar o tronco para trás para levantar a barra.', 'Levar os cotovelos para a frente na subida.', 'Descer a barra rápido demais.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Só os antebraços devem se mover.', 'Mantenha os joelhos levemente destravados e o abdome contraído.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['forearms']::text[]) as m
 where e.slug = 'rosca-direta-com-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('rosca-direta-com-halteres', 'Rosca direta com halteres', 'Dumbbell Bicep Curl', 'biceps', 'dumbbell', 'beginner', 'isolation', 'strength', array['Fique em pé com um halter em cada mão e os braços estendidos ao lado do corpo.', 'Mantenha os cotovelos junto ao tronco e gire as palmas para a frente.', 'Sem mover a parte de cima dos braços, suba os halteres até a altura dos ombros.', 'Aperte o bíceps por um instante no alto.', 'Desça os halteres devagar até a posição inicial.']::text[], array['Balançar o tronco para subir o peso.', 'Afastar os cotovelos do corpo.', 'Não estender totalmente os braços na descida.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha os ombros para trás e o peito aberto.', 'Use uma carga que permita controlar todo o movimento.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['forearms']::text[]) as m
 where e.slug = 'rosca-direta-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('rosca-scott', 'Rosca Scott', 'Preacher Curl', 'biceps', 'ez_bar', 'beginner', 'isolation', 'strength', array['Sente no banco Scott e apoie a parte de trás dos braços e o peito no apoio.', 'Segure a barra W na pegada interna, com as palmas para a frente.', 'Comece com a barra na altura dos ombros.', 'Desça a barra devagar até quase estender os braços, sentindo o bíceps alongar.', 'Suba a barra dobrando os cotovelos até a altura dos ombros.', 'Aperte o bíceps por um segundo no alto e repita.']::text[], array['Tirar os braços do apoio durante a subida.', 'Deixar a barra cair no fim da descida.', 'Travar os cotovelos com força na extensão.']::text[], array['Puxe o ar ao descer e solte o ar ao subir.', 'Controle bem a parte final da descida.', 'Mantenha o peito encostado no apoio o tempo todo.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['forearms']::text[]) as m
 where e.slug = 'rosca-scott' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('rosca-concentrada', 'Rosca concentrada', 'Concentration Curls', 'biceps', 'dumbbell', 'beginner', 'isolation', 'strength', array['Sente na ponta de um banco com as pernas afastadas e os pés no chão.', 'Pegue o halter com uma mão e apoie a parte de trás do braço na parte interna da coxa.', 'Deixe o braço estendido, com a palma voltada para a frente e o halter acima do chão.', 'Sem mover o braço, suba o halter dobrando o cotovelo até perto do ombro.', 'Aperte o bíceps por um instante e desça devagar.', 'Complete as repetições e troque de lado.']::text[], array['Usar o tronco para ajudar a subir o peso.', 'Tirar o braço do apoio na coxa.', 'Encurtar a descida.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha as costas retas, inclinando o tronco a partir do quadril.', 'Faça o movimento devagar para sentir o bíceps trabalhar.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['forearms']::text[]) as m
 where e.slug = 'rosca-concentrada' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('rosca-martelo-na-polia-com-corda', 'Rosca martelo na polia com corda', 'Cable Hammer Curls - Rope Attachment', 'biceps', 'cable', 'beginner', 'isolation', 'strength', array['Prenda a corda na polia baixa e fique de frente para o aparelho, a cerca de 30 cm.', 'Segure a corda com as palmas voltadas uma para a outra.', 'Fique ereto com os cotovelos junto ao corpo.', 'Sem mover a parte de cima dos braços, suba a corda dobrando os cotovelos até o bíceps encostar nos antebraços.', 'Segure a contração por um instante.', 'Volte devagar até estender os braços.']::text[], array['Mover os cotovelos para a frente.', 'Inclinar o tronco para trás para puxar.', 'Deixar o cabo voltar sem controle.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha a curvatura natural das costas e o tronco parado.', 'Só os antebraços devem se mover.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['forearms']::text[]) as m
 where e.slug = 'rosca-martelo-na-polia-com-corda' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('rosca-direta-com-barra-w', 'Rosca direta com barra W', 'EZ-Bar Curl', 'biceps', 'ez_bar', 'beginner', 'isolation', 'strength', array['Fique em pé segurando a barra W na pegada externa, com as palmas para a frente.', 'Mantenha os cotovelos junto ao tronco.', 'Sem mover a parte de cima dos braços, suba a barra dobrando os cotovelos.', 'Continue até a barra chegar perto dos ombros e aperte o bíceps.', 'Desça a barra devagar até estender os braços.']::text[], array['Balançar o corpo para levantar a barra.', 'Afastar os cotovelos do tronco.', 'Descer sem controle.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha o abdome firme e o tronco parado.', 'Pense em mover apenas os antebraços.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['forearms']::text[]) as m
 where e.slug = 'rosca-direta-com-barra-w' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('rosca-inclinada-com-halteres', 'Rosca inclinada com halteres', 'Incline Dumbbell Curl', 'biceps', 'dumbbell', 'beginner', 'isolation', 'strength', array['Sente em um banco inclinado com um halter em cada mão e os braços estendidos.', 'Mantenha os cotovelos junto ao tronco e as palmas voltadas para a frente.', 'Sem mover a parte de cima dos braços, suba os halteres até a altura dos ombros.', 'Aperte o bíceps por um instante no alto.', 'Desça os halteres devagar até estender os braços.']::text[], array['Tirar as costas do banco ao subir o peso.', 'Levar os cotovelos para a frente.', 'Usar carga alta demais e perder a amplitude.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha a cabeça e as costas apoiadas no banco.', 'Aproveite o alongamento do bíceps na descida, sem pressa.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['forearms']::text[]) as m
 where e.slug = 'rosca-inclinada-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('triceps-coice-com-halteres', 'Tríceps coice com halteres', 'Tricep Dumbbell Kickback', 'triceps', 'dumbbell', 'beginner', 'isolation', 'strength', array['Segure um halter em cada mão com as palmas voltadas para o corpo.', 'Dobre levemente os joelhos e incline o tronco à frente, quase paralelo ao chão, com as costas retas.', 'Mantenha a parte de cima dos braços junto ao tronco e paralela ao chão, com os antebraços apontando para baixo.', 'Sem mover a parte de cima dos braços, estenda os cotovelos levando os halteres para trás.', 'Segure um instante com os braços estendidos.', 'Volte devagar à posição inicial.']::text[], array['Deixar os cotovelos caírem durante o movimento.', 'Balançar os halteres em vez de estender os braços.', 'Arredondar as costas.']::text[], array['Solte o ar ao estender os braços e puxe o ar ao voltar.', 'Mantenha a cabeça alinhada com a coluna.', 'Use carga leve para manter os cotovelos parados.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('triceps-na-polia-com-barra', 'Tríceps na polia com barra', 'Triceps Pushdown', 'triceps', 'cable', 'beginner', 'isolation', 'strength', array['Prenda uma barra reta ou angulada na polia alta e segure com as palmas para baixo, na largura dos ombros.', 'Fique ereto, com leve inclinação do tronco à frente e os cotovelos junto ao corpo.', 'Comece com os antebraços apontando para cima.', 'Sem mover a parte de cima dos braços, empurre a barra para baixo até estender os cotovelos.', 'Segure um instante e volte devagar até os antebraços ficarem um pouco acima da linha do cotovelo.']::text[], array['Afastar os cotovelos do corpo.', 'Usar o peso do corpo para empurrar a barra.', 'Deixar a barra subir rápido demais.']::text[], array['Solte o ar ao empurrar e puxe o ar ao voltar.', 'Mantenha os ombros baixos e o abdome firme.', 'Só os antebraços devem se mover.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('triceps-na-polia-com-corda', 'Tríceps na polia com corda', 'Triceps Pushdown - Rope Attachment', 'triceps', 'cable', 'beginner', 'isolation', 'strength', array['Prenda a corda na polia alta e segure com as palmas voltadas uma para a outra.', 'Fique ereto, com leve inclinação do tronco à frente e os cotovelos junto ao corpo.', 'Sem mover a parte de cima dos braços, empurre a corda para baixo até estender os cotovelos.', 'No fim, afaste levemente as pontas da corda para os lados.', 'Volte devagar até os antebraços ficarem um pouco acima da linha do cotovelo.']::text[], array['Abrir os cotovelos durante o movimento.', 'Inclinar demais o tronco para empurrar.', 'Não estender totalmente os braços.']::text[], array['Solte o ar ao empurrar e puxe o ar ao voltar.', 'Mantenha os punhos firmes e alinhados aos antebraços.', 'Controle a volta da corda.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('triceps-testa-com-barra-w', 'Tríceps testa com barra W', 'Lying Triceps Press', 'triceps', 'ez_bar', 'intermediate', 'isolation', 'strength', array['Deite no banco reto com os pés apoiados no chão.', 'Segure a barra W com as palmas para baixo e as mãos na largura média.', 'Estenda os braços acima do peito, perpendiculares ao chão, com os cotovelos fechados.', 'Sem mover a parte de cima dos braços, desça a barra devagar até quase tocar a testa.', 'Estenda os cotovelos e volte à posição inicial.']::text[], array['Abrir os cotovelos para os lados.', 'Mover os ombros e transformar o exercício em supino.', 'Descer a barra rápido demais em direção à cabeça.']::text[], array['Puxe o ar ao descer e solte o ar ao subir.', 'Mantenha os cotovelos apontando para o teto.', 'Use carga que permita total controle perto do rosto.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('triceps-frances-com-halter', 'Tríceps francês com halter', 'Standing Dumbbell Triceps Extension', 'triceps', 'dumbbell', 'beginner', 'isolation', 'strength', array['Fique em pé com os pés na largura dos ombros e segure um halter com as duas mãos.', 'Eleve o halter acima da cabeça até estender os braços, apoiando o peso nas palmas.', 'Mantenha os braços junto à cabeça e os cotovelos apontando para cima.', 'Desça o halter atrás da cabeça em arco, dobrando apenas os cotovelos.', 'Estenda os cotovelos e volte à posição inicial.']::text[], array['Abrir os cotovelos para os lados.', 'Arquear a lombar ao estender os braços.', 'Mover a parte de cima dos braços.']::text[], array['Puxe o ar ao descer e solte o ar ao subir.', 'Contraia o abdome e os glúteos para proteger a lombar.', 'Segure o halter com firmeza, com os polegares em volta dele.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('mergulho-no-banco', 'Mergulho no banco', 'Bench Dips', 'triceps', 'body_weight', 'beginner', 'compound', 'strength', array['Fique de costas para um banco e apoie as mãos na borda, na largura dos ombros.', 'Estenda as pernas à frente e mantenha os braços estendidos.', 'Dobre os cotovelos e desça o corpo devagar até formar cerca de 90 graus nos cotovelos.', 'Mantenha o tronco próximo ao banco durante a descida.', 'Empurre com os braços e volte à posição inicial.']::text[], array['Descer além de 90 graus e forçar os ombros.', 'Abrir os cotovelos para os lados.', 'Afastar o corpo do banco.']::text[], array['Puxe o ar ao descer e solte o ar ao subir.', 'Mantenha os ombros para trás e o peito aberto.', 'Para facilitar, dobre os joelhos.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['chest', 'front_delts']::text[]) as m
 where e.slug = 'mergulho-no-banco' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('supino-fechado-com-barra', 'Supino fechado com barra', 'Close-Grip Barbell Bench Press', 'triceps', 'barbell', 'beginner', 'compound', 'strength', array['Deite no banco reto com os pés apoiados no chão.', 'Segure a barra com as mãos na largura dos ombros e tire-a do suporte.', 'Posicione a barra acima do peito com os braços estendidos.', 'Desça a barra devagar até o meio do peito, mantendo os cotovelos junto ao corpo.', 'Empurre a barra para cima até estender os braços.']::text[], array['Abrir os cotovelos como no supino comum.', 'Fechar demais a pegada e forçar os punhos.', 'Tirar o quadril do banco ao empurrar.']::text[], array['Puxe o ar ao descer e solte o ar ao empurrar.', 'Mantenha as escápulas apoiadas e firmes no banco.', 'Use alguém para ajudar quando a carga for alta.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['chest', 'front_delts']::text[]) as m
 where e.slug = 'supino-fechado-com-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('mergulho-nas-paralelas-para-triceps', 'Mergulho nas paralelas para tríceps', 'Dips - Triceps Version', 'triceps', 'body_weight', 'beginner', 'compound', 'strength', array['Segure as barras paralelas e sustente o corpo com os braços quase estendidos.', 'Mantenha o tronco ereto e os cotovelos junto ao corpo.', 'Desça devagar dobrando os cotovelos até formar cerca de 90 graus.', 'Empurre com os braços e volte à posição inicial.']::text[], array['Inclinar o tronco à frente e tirar o foco do tríceps.', 'Descer além do confortável e forçar os ombros.', 'Balançar as pernas para subir.']::text[], array['Puxe o ar ao descer e solte o ar ao subir.', 'Mantenha os ombros longe das orelhas.', 'Cruze os pés atrás para manter o corpo estável.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['chest', 'front_delts']::text[]) as m
 where e.slug = 'mergulho-nas-paralelas-para-triceps' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('rosca-de-punho-com-barra', 'Rosca de punho com barra', 'Palms-Up Barbell Wrist Curl Over A Bench', 'forearms', 'barbell', 'beginner', 'isolation', 'strength', array['Ajoelhe de frente para um banco reto com a barra ao lado.', 'Segure a barra com as palmas para cima.', 'Apoie os antebraços no banco, deixando os punhos para fora da borda.', 'Dobre os punhos para cima, levantando a barra.', 'Desça os punhos devagar até a posição inicial.']::text[], array['Tirar os antebraços do banco.', 'Usar os braços para ajudar a levantar.', 'Fazer o movimento curto e rápido.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Só os punhos devem se mover.', 'Use carga leve e amplitude completa.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('rosca-de-punho-inversa-com-barra', 'Rosca de punho inversa com barra', 'Palms-Down Wrist Curl Over A Bench', 'forearms', 'barbell', 'beginner', 'isolation', 'strength', array['Ajoelhe de frente para um banco reto com a barra ao lado.', 'Segure a barra com as palmas para baixo.', 'Apoie os antebraços no banco, deixando os punhos para fora da borda.', 'Estenda os punhos para cima, levantando a barra.', 'Desça os punhos devagar até a posição inicial.']::text[], array['Tirar os antebraços do banco.', 'Usar carga alta demais e encurtar o movimento.', 'Soltar a barra na descida.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha os antebraços parados.', 'Faça o movimento devagar e controlado.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('rosca-inversa-com-barra', 'Rosca inversa com barra', 'Reverse Barbell Curl', 'biceps', 'barbell', 'beginner', 'isolation', 'strength', array['Fique em pé com o tronco ereto e segure a barra na largura dos ombros, com as palmas para baixo.', 'Mantenha os cotovelos junto ao tronco.', 'Sem mover a parte de cima dos braços, suba a barra dobrando os cotovelos.', 'Continue até a barra chegar perto dos ombros e segure um instante.', 'Desça a barra devagar até estender os braços.']::text[], array['Deixar os punhos dobrarem para baixo.', 'Balançar o corpo para subir a barra.', 'Afastar os cotovelos do tronco.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha os punhos alinhados com os antebraços.', 'Use carga menor do que na rosca direta.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['forearms']::text[]) as m
 where e.slug = 'rosca-inversa-com-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('caminhada-do-fazendeiro', 'Caminhada do fazendeiro', 'Farmer''s Walk', 'forearms', 'other', 'intermediate', 'compound', 'strength', array['Fique em pé entre os dois implementos de carga.', 'Agache, segure as alças com firmeza e mantenha as costas retas.', 'Levante os pesos empurrando o chão com os calcanhares, com a cabeça erguida.', 'Caminhe com passos curtos e rápidos pela distância definida.', 'Ao final, apoie os pesos no chão agachando com as costas retas.']::text[], array['Arredondar as costas ao pegar ou soltar os pesos.', 'Inclinar o tronco para um dos lados.', 'Prender a respiração durante toda a caminhada.']::text[], array['Respire de forma curta e constante enquanto caminha.', 'Mantenha os ombros para trás e o abdome firme.', 'Olhe para a frente, não para os pés.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['traps', 'abs', 'glutes', 'quadriceps', 'lower_back']::text[]) as m
 where e.slug = 'caminhada-do-fazendeiro' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('abdominal-crunch', 'Abdominal crunch', 'Crunches', 'abs', 'body_weight', 'beginner', 'isolation', 'strength', array['Deite de costas com os joelhos dobrados e os pés apoiados no chão.', 'Apoie as mãos de leve ao lado da cabeça, sem entrelaçar os dedos.', 'Contraia o abdome e tire os ombros do chão, aproximando as costelas do quadril.', 'Segure a contração por um instante no alto.', 'Desça devagar até apoiar os ombros novamente.']::text[], array['Puxar a cabeça com as mãos.', 'Subir o tronco inteiro e tirar a lombar do chão.', 'Fazer o movimento com impulso.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha um espaço entre o queixo e o peito.', 'Pense em encurtar o abdome, não em sentar.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('prancha-abdominal', 'Prancha abdominal', 'Plank', 'abs', 'body_weight', 'beginner', 'isolation', 'strength', array['Deite de barriga para baixo e apoie os antebraços no chão, com os cotovelos abaixo dos ombros.', 'Apoie as pontas dos pés e eleve o corpo do chão.', 'Mantenha o corpo reto da cabeça aos calcanhares.', 'Segure a posição pelo tempo definido.', 'Apoie os joelhos no chão para sair da posição.']::text[], array['Deixar o quadril cair e arquear a lombar.', 'Elevar demais o quadril.', 'Prender a respiração.']::text[], array['Respire de forma calma e contínua durante a prancha.', 'Contraia o abdome e os glúteos o tempo todo.', 'Mantenha o olhar para o chão, com o pescoço alinhado.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['obliques']::text[]) as m
 where e.slug = 'prancha-abdominal' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('elevacao-de-pernas-joelho-flexionado', 'Elevação de pernas com joelho flexionado', 'Bent-Knee Hip Raise', 'abs', 'body_weight', 'beginner', 'compound', 'strength', array['Deite de costas com os braços ao lado do corpo.', 'Dobre os joelhos e tire os pés alguns centímetros do chão.', 'Usando o abdome, traga os joelhos em direção ao peito, mantendo o ângulo dos joelhos.', 'Continue até o quadril sair do chão, enrolando a pelve para trás.', 'Aperte o abdome por um segundo no alto.', 'Volte devagar à posição inicial.']::text[], array['Usar impulso das pernas em vez do abdome.', 'Empurrar o chão com as mãos para subir.', 'Deixar as pernas caírem rápido na volta.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha o movimento controlado o tempo todo.', 'Deixe a lombar apoiada no chão na volta.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('abdominal-crunch-grupado', 'Abdominal crunch grupado', 'Tuck Crunch', 'abs', 'body_weight', 'beginner', 'isolation', 'strength', array['Deite de costas com a lombar apoiada no chão.', 'Cruze os tornozelos e eleve as pernas até as coxas ficarem perpendiculares ao chão, com os joelhos dobrados.', 'Cruze os braços sobre o peito.', 'Mantendo a lombar no chão, tire os ombros do chão contraindo o abdome.', 'Desça o tronco devagar até a posição inicial.']::text[], array['Balançar as pernas durante o movimento.', 'Puxar o pescoço para a frente.', 'Tirar a lombar do chão.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha as pernas paradas na mesma posição.', 'Suba pouco e com controle, focando no abdome.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('abdominal-canivete', 'Abdominal canivete', 'Jackknife Sit-Up', 'abs', 'body_weight', 'beginner', 'compound', 'strength', array['Deite de costas com os braços estendidos acima da cabeça e as pernas estendidas.', 'Dobre o quadril e eleve ao mesmo tempo as pernas e o tronco.', 'Leve os braços estendidos em direção às pernas, que sobem até cerca de 35 a 45 graus do chão.', 'Mantenha a parte de cima do tronco fora do chão no ponto mais alto.', 'Desça braços e pernas devagar até a posição inicial.']::text[], array['Usar impulso dos braços para subir.', 'Deixar braços e pernas caírem de uma vez.', 'Arquear a lombar na volta.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha as pernas estendidas e unidas.', 'Se for difícil, dobre levemente os joelhos.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('elevacao-de-pernas-suspenso-na-barra', 'Elevação de pernas suspenso na barra', 'Hanging Leg Raise', 'abs', 'body_weight', 'advanced', 'isolation', 'strength', array['Pendure-se na barra fixa com os braços estendidos e pegada média ou aberta.', 'Deixe as pernas retas para baixo, com a pelve levemente rodada para trás.', 'Eleve as pernas até formarem cerca de 90 graus com o tronco.', 'Segure a contração por um instante no alto.', 'Desça as pernas devagar até a posição inicial.']::text[], array['Balançar o corpo para elevar as pernas.', 'Deixar as pernas caírem rápido.', 'Encolher os ombros perto das orelhas.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha o tronco parado e os ombros ativos.', 'Se for difícil, faça com os joelhos dobrados.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['forearms']::text[]) as m
 where e.slug = 'elevacao-de-pernas-suspenso-na-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('elevacao-de-pernas-no-banco', 'Elevação de pernas no banco', 'Flat Bench Lying Leg Raise', 'abs', 'bench', 'beginner', 'isolation', 'strength', array['Deite de costas em um banco reto com as pernas estendidas para fora da ponta.', 'Segure nas laterais do banco ou coloque as mãos sob os glúteos.', 'Com as pernas quase retas, eleve-as até formarem 90 graus com o chão.', 'Segure a contração por um segundo no alto.', 'Desça as pernas devagar sem encostá-las no chão.']::text[], array['Arquear a lombar ao descer as pernas.', 'Usar impulso para subir.', 'Dobrar muito os joelhos.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha a lombar apoiada no banco.', 'Controle bem a descida.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('abdominal-russo', 'Abdominal russo', 'Russian Twist', 'obliques', 'body_weight', 'intermediate', 'compound', 'strength', array['Sente no chão com os joelhos dobrados e os pés presos sob um apoio firme ou segurados por alguém.', 'Incline o tronco para trás formando um V com as coxas.', 'Estenda os braços à frente com as mãos unidas.', 'Gire o tronco para a direita até os braços ficarem paralelos ao chão.', 'Volte ao centro e gire para a esquerda.', 'Alterne os lados até completar as repetições.']::text[], array['Girar só os braços sem girar o tronco.', 'Arredondar as costas.', 'Fazer o movimento rápido e sem controle.']::text[], array['Solte o ar ao girar e puxe o ar ao voltar ao centro.', 'Mantenha o peito aberto e as costas retas.', 'Contraia o abdome durante todo o exercício.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['abs', 'lower_back']::text[]) as m
 where e.slug = 'abdominal-russo' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('prancha-lateral', 'Prancha lateral', 'Side Bridge', 'obliques', 'body_weight', 'beginner', 'isolation', 'strength', array['Deite de lado com as pernas estendidas e uma sobre a outra.', 'Apoie o antebraço no chão com o cotovelo abaixo do ombro.', 'Eleve o quadril do chão até o corpo ficar reto da cabeça aos pés.', 'Segure a posição pelo tempo definido.', 'Desça o quadril devagar e troque de lado.']::text[], array['Deixar o quadril cair em direção ao chão.', 'Girar o tronco para a frente ou para trás.', 'Afundar o ombro de apoio.']::text[], array['Respire de forma calma e contínua durante a posição.', 'Mantenha o abdome e os glúteos contraídos.', 'Para facilitar, apoie o joelho de baixo no chão.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['abs', 'side_delts']::text[]) as m
 where e.slug = 'prancha-lateral' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('abdominal-crunch-na-polia', 'Abdominal crunch na polia', 'Cable Crunch', 'abs', 'cable', 'beginner', 'isolation', 'strength', array['Prenda a corda na polia alta e ajoelhe-se de frente para o aparelho.', 'Segure a corda e traga as mãos para perto do rosto.', 'Dobre levemente o quadril e deixe o peso alongar o abdome.', 'Com o quadril parado, flexione o tronco levando os cotovelos em direção ao meio das coxas.', 'Segure a contração por um segundo.', 'Volte devagar à posição inicial.']::text[], array['Sentar para trás e usar o peso do corpo.', 'Puxar a corda com os braços.', 'Mover o quadril durante o exercício.']::text[], array['Solte o ar ao descer o tronco e puxe o ar ao voltar.', 'Mantenha as mãos paradas junto ao rosto.', 'Pense em enrolar a coluna, aproximando costelas e quadril.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('abdominal-com-rodinha', 'Abdominal com rodinha', 'Ab Roller', 'abs', 'other', 'intermediate', 'compound', 'strength', array['Ajoelhe no chão e segure a rodinha com as duas mãos.', 'Apoie a rodinha no chão à frente, ficando em quatro apoios.', 'Role a rodinha para a frente devagar, estendendo o corpo.', 'Vá até onde conseguir sem encostar o corpo no chão e sem arquear a lombar.', 'Faça uma pausa e puxe a rodinha de volta usando o abdome.']::text[], array['Arquear a lombar na parte mais longa.', 'Ir além do que consegue controlar.', 'Voltar puxando com o quadril em vez do abdome.']::text[], array['Puxe o ar ao rolar para a frente e solte o ar ao voltar.', 'Mantenha o abdome firme e o quadril encaixado.', 'Aumente a distância aos poucos.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['lats', 'front_delts']::text[]) as m
 where e.slug = 'abdominal-com-rodinha' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('abdominal-bicicleta', 'Abdominal bicicleta', 'Air Bike', 'abs', 'body_weight', 'beginner', 'compound', 'strength', array['Deite de costas com a lombar apoiada no chão e as mãos ao lado da cabeça.', 'Tire os ombros do chão como no abdominal crunch.', 'Eleve os joelhos até ficarem acima do quadril, com as canelas paralelas ao chão.', 'Estenda uma perna enquanto aproxima o cotovelo oposto do joelho que vem em sua direção.', 'Troque de lado em um movimento de pedalar.', 'Alterne os lados de forma contínua e controlada.']::text[], array['Puxar o pescoço com as mãos.', 'Pedalar rápido demais e perder o controle.', 'Tirar a lombar do chão.']::text[], array['Solte o ar a cada giro do tronco.', 'Gire o tronco, não apenas os cotovelos.', 'Mantenha os ombros fora do chão durante a série.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['obliques']::text[]) as m
 where e.slug = 'abdominal-bicicleta' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('escalador', 'Escalador', 'Mountain Climbers', 'quadriceps', 'body_weight', 'beginner', 'compound', 'plyometrics', array['Fique em posição de flexão, com o peso apoiado nas mãos e nas pontas dos pés.', 'Traga um joelho para baixo do quadril, dobrando a perna.', 'Troque as pernas de forma rápida, estendendo a dobrada e trazendo a outra à frente.', 'Continue alternando por 20 a 30 segundos.']::text[], array['Elevar demais o quadril.', 'Deixar os ombros passarem muito à frente das mãos.', 'Perder o ritmo e apoiar o pé inteiro no chão.']::text[], array['Respire de forma rápida e ritmada, sem prender o ar.', 'Mantenha o abdome firme e as costas retas.', 'Deixe as mãos alinhadas abaixo dos ombros.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['abs', 'chest', 'hamstrings', 'front_delts']::text[]) as m
 where e.slug = 'escalador' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('inseto-morto', 'Inseto morto', 'Dead Bug', 'abs', 'body_weight', 'beginner', 'compound', 'strength', array['Deite de costas com os braços estendidos em direção ao teto.', 'Eleve as pernas com quadril e joelhos dobrados a 90 graus.', 'Solte o ar com força, aproxime as costelas do quadril e cole a lombar no chão.', 'Estenda uma perna até deixá-la logo acima do chão, sem tirar a lombar do chão.', 'Volte a perna à posição inicial e repita com a outra.']::text[], array['Deixar a lombar sair do chão ao estender a perna.', 'Fazer o movimento rápido demais.', 'Prender a respiração.']::text[], array['Solte o ar ao estender a perna e puxe o ar ao voltar.', 'Mantenha os glúteos contraídos durante todo o exercício.', 'Desça a perna só até onde conseguir manter a lombar apoiada.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['obliques']::text[]) as m
 where e.slug = 'inseto-morto' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('abdominal-obliquo-no-chao', 'Abdominal oblíquo no chão', 'Oblique Crunches - On The Floor', 'obliques', 'body_weight', 'beginner', 'isolation', 'strength', array['Deite sobre o lado direito com as pernas uma sobre a outra e os joelhos levemente dobrados.', 'Coloque a mão esquerda atrás da cabeça.', 'Eleve o cotovelo esquerdo em direção ao quadril, contraindo a lateral do abdome.', 'Suba o máximo que conseguir e segure por um segundo.', 'Desça devagar até a posição inicial.', 'Complete as repetições e troque de lado.']::text[], array['Puxar a cabeça com a mão.', 'Usar impulso para subir.', 'Girar o tronco para trás em vez de flexionar para o lado.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Faça o movimento curto e controlado.', 'Mantenha o pescoço relaxado e alinhado.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['abs']::text[]) as m
 where e.slug = 'abdominal-obliquo-no-chao' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('abdominal-remador', 'Abdominal remador', null, 'abs', 'body_weight', 'beginner', 'compound', 'strength', array['Deite de costas com os braços estendidos acima da cabeça e as pernas estendidas.', 'Contraia o abdome para preparar o movimento.', 'Suba o tronco ao mesmo tempo em que dobra os joelhos e os traz em direção ao peito.', 'Leve os braços à frente, ao lado das pernas, como no movimento de remar.', 'Volte de forma controlada, estendendo pernas, tronco e braços até a posição inicial.']::text[], array['Jogar os braços para ganhar impulso.', 'Deixar o corpo cair de uma vez na volta.', 'Arquear a lombar ao estender as pernas.']::text[], array['Solte o ar ao subir e puxe o ar ao voltar.', 'Mantenha o ritmo constante e controlado.', 'Se a lombar sair do chão, não estenda tanto as pernas na volta.']::text[], 'own')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['obliques']::text[]) as m
 where e.slug = 'abdominal-remador' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('puxada-alta', 'Puxada alta', 'Wide-Grip Lat Pulldown', 'lats', 'cable', 'beginner', 'compound', 'strength', array['Ajuste o apoio das coxas para que fiquem bem presas sob as almofadas.', 'Segure a barra com as palmas para a frente e as mãos mais afastadas que a largura dos ombros.', 'Sente-se com os braços estendidos, incline o tronco cerca de 30 graus para trás e projete o peito.', 'Puxe a barra até a parte de cima do peito, levando os ombros e os cotovelos para baixo e para trás.', 'Aperte as escápulas por um segundo na posição final.', 'Volte a barra devagar até estender os braços por completo, sentindo o alongamento das costas.']::text[], array['Balançar o tronco para trás para ajudar a puxar.', 'Puxar com os antebraços em vez de usar as costas.', 'Soltar a barra rápido na subida, sem controle.', 'Levar a barra atrás da nuca.']::text[], array['Solte o ar ao puxar e puxe o ar ao voltar.', 'Pense em levar os cotovelos em direção ao quadril.', 'Mantenha o peito aberto e o tronco parado durante toda a série.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['biceps', 'middle_back', 'rear_delts']::text[]) as m
 where e.slug = 'puxada-alta' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('puxada-alta-pegada-fechada', 'Puxada alta com pegada fechada', 'Close-Grip Front Lat Pulldown', 'lats', 'cable', 'beginner', 'compound', 'strength', array['Ajuste o apoio das coxas para que fiquem bem presas sob as almofadas.', 'Segure a barra com as palmas para a frente e as mãos mais próximas que a largura dos ombros.', 'Sente-se com os braços estendidos, incline o tronco cerca de 30 graus para trás e projete o peito.', 'Puxe a barra até a parte de cima do peito, levando os ombros e os cotovelos para baixo e para trás.', 'Aperte as escápulas por um segundo na posição final.', 'Volte a barra devagar até estender os braços por completo.']::text[], array['Jogar o tronco para trás para ganhar impulso.', 'Encolher os ombros em direção às orelhas.', 'Fazer a volta rápido, sem controlar o peso.']::text[], array['Solte o ar ao puxar e puxe o ar ao voltar.', 'Mantenha os cotovelos apontando para baixo durante a puxada.', 'Deixe as mãos apenas segurarem a barra; a força vem das costas.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['biceps', 'middle_back', 'rear_delts']::text[]) as m
 where e.slug = 'puxada-alta-pegada-fechada' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('barra-fixa', 'Barra fixa', 'Pullups', 'lats', 'body_weight', 'beginner', 'compound', 'strength', array['Segure a barra com as palmas para a frente e as mãos um pouco mais afastadas que os ombros.', 'Fique pendurado com os braços estendidos, peito projetado e abdômen firme.', 'Puxe o corpo para cima levando os ombros e os cotovelos para baixo e para trás.', 'Suba até o queixo passar da barra e aperte as escápulas por um segundo.', 'Desça devagar até estender os braços por completo.']::text[], array['Balançar o corpo ou chutar as pernas para subir.', 'Fazer meia repetição, sem estender os braços na descida.', 'Esticar o pescoço para alcançar a barra com o queixo.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Comece cada repetição puxando as escápulas para baixo.', 'Mantenha as pernas juntas e o corpo estável.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['biceps', 'middle_back', 'rear_delts', 'forearms']::text[]) as m
 where e.slug = 'barra-fixa' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('barra-fixa-supinada', 'Barra fixa supinada', 'Chin-Up', 'lats', 'body_weight', 'beginner', 'compound', 'strength', array['Segure a barra com as palmas voltadas para você e as mãos na largura dos ombros ou um pouco mais fechadas.', 'Fique pendurado com os braços estendidos, tronco reto e peito projetado.', 'Puxe o corpo para cima mantendo os cotovelos próximos ao corpo.', 'Suba até a cabeça passar da altura da barra e segure um segundo.', 'Desça devagar até estender os braços por completo.']::text[], array['Balançar o corpo para ganhar impulso.', 'Abrir os cotovelos para os lados durante a subida.', 'Despencar na descida.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha o abdômen contraído para o corpo não balançar.', 'Controle a descida em cerca de dois segundos.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['biceps', 'forearms', 'middle_back']::text[]) as m
 where e.slug = 'barra-fixa-supinada' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('pulldown-bracos-estendidos', 'Pulldown com braços estendidos', 'Straight-Arm Pulldown', 'lats', 'cable', 'beginner', 'isolation', 'strength', array['Segure a barra da polia alta com as palmas para baixo e as mãos um pouco mais afastadas que os ombros.', 'Dê dois passos para trás e incline o tronco cerca de 30 graus à frente.', 'Estenda os braços à frente, mantendo os cotovelos levemente flexionados.', 'Com os braços firmes, puxe a barra para baixo até as mãos chegarem ao lado das coxas.', 'Volte devagar à posição inicial sem dobrar os cotovelos.']::text[], array['Dobrar os cotovelos e transformar o movimento em um tríceps.', 'Mexer o tronco para cima e para baixo durante a puxada.', 'Encolher os ombros no início do movimento.']::text[], array['Solte o ar ao puxar e puxe o ar ao voltar.', 'Pense em empurrar a barra em arco, de cima para baixo.', 'Mantenha o abdômen firme e as costas retas.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['triceps', 'rear_delts']::text[]) as m
 where e.slug = 'pulldown-bracos-estendidos' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('remada-cavalinho', 'Remada cavalinho', 'T-Bar Row with Handle', 'middle_back', 'barbell', 'beginner', 'compound', 'strength', array['Prenda uma ponta da barra em um suporte articulado ou em um canto e coloque peso na outra ponta.', 'Fique de pé sobre a barra e encaixe o puxador em V logo abaixo das anilhas.', 'Afaste bem os pés, leve o quadril para trás e mantenha o peito para cima com os braços estendidos.', 'Puxe o peso até a parte de cima do abdômen, juntando as escápulas e dobrando os cotovelos.', 'Faça uma breve pausa e volte devagar à posição inicial.']::text[], array['Arredondar a lombar durante o movimento.', 'Dar trancos com o tronco para levantar o peso.', 'Subir o tronco a cada repetição.']::text[], array['Solte o ar ao puxar e puxe o ar ao descer.', 'Mantenha o tronco inclinado e parado durante toda a série.', 'Leve os cotovelos para trás, rente ao corpo.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['lats', 'biceps', 'rear_delts']::text[]) as m
 where e.slug = 'remada-cavalinho' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('remada-com-halteres', 'Remada com halteres (serrote)', 'One-Arm Dumbbell Row', 'middle_back', 'dumbbell', 'beginner', 'compound', 'strength', array['Apoie o joelho e a mão do mesmo lado em um banco reto, com o tronco paralelo ao chão.', 'Pegue o halter com a outra mão, palma voltada para o corpo e braço estendido.', 'Mantenha as costas retas e o olhar para o chão.', 'Puxe o halter em linha reta até a lateral do tronco, com o cotovelo rente ao corpo.', 'Aperte as costas no topo e desça o halter devagar até estender o braço.', 'Termine as repetições e troque de lado.']::text[], array['Girar o tronco para levantar o halter.', 'Puxar só com o braço, sem usar as costas.', 'Arredondar a coluna.']::text[], array['Solte o ar ao puxar e puxe o ar ao descer.', 'Pense em levar o cotovelo em direção ao quadril.', 'Mantenha o ombro do braço de apoio firme e afastado da orelha.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['lats', 'biceps', 'rear_delts']::text[]) as m
 where e.slug = 'remada-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('remada-baixa', 'Remada baixa', 'Seated Cable Rows', 'middle_back', 'cable', 'beginner', 'compound', 'strength', array['Sente-se na máquina com os pés na plataforma e os joelhos levemente flexionados.', 'Incline o tronco à frente com as costas retas e segure o triângulo com as palmas voltadas uma para a outra.', 'Volte o tronco até ficar perpendicular às pernas, com o peito aberto e os braços estendidos.', 'Puxe o triângulo até tocar o abdômen, mantendo os cotovelos rentes ao corpo.', 'Aperte as escápulas por um segundo.', 'Volte devagar até estender os braços, sem mexer o tronco.']::text[], array['Balançar o tronco para frente e para trás.', 'Arredondar as costas na volta.', 'Travar os joelhos totalmente esticados.']::text[], array['Solte o ar ao puxar e puxe o ar ao voltar.', 'Mantenha o peito para cima e os ombros longe das orelhas.', 'Pense em levar os cotovelos para trás, não em puxar com as mãos.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['lats', 'biceps', 'rear_delts']::text[]) as m
 where e.slug = 'remada-baixa' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('remada-curvada-com-barra', 'Remada curvada com barra', 'Bent Over Barbell Row', 'middle_back', 'barbell', 'beginner', 'compound', 'strength', array['Segure a barra com as palmas para baixo e as mãos na largura dos ombros.', 'Dobre levemente os joelhos e incline o tronco à frente, com as costas retas, até quase ficar paralelo ao chão.', 'Deixe a barra pendurada à frente com os braços estendidos.', 'Puxe a barra em direção ao abdômen, mantendo os cotovelos próximos ao corpo.', 'Aperte as costas por um instante no topo.', 'Desça a barra devagar até estender os braços.']::text[], array['Arredondar a lombar.', 'Levantar o tronco a cada repetição para ajudar a puxar.', 'Usar impulso das pernas.']::text[], array['Solte o ar ao puxar e puxe o ar ao descer.', 'Mantenha o abdômen contraído para proteger a lombar.', 'Deixe o pescoço alinhado com a coluna.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['lats', 'biceps', 'rear_delts', 'lower_back']::text[]) as m
 where e.slug = 'remada-curvada-com-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('remada-curvada-com-halteres', 'Remada curvada com halteres', 'Bent Over Two-Dumbbell Row', 'middle_back', 'dumbbell', 'beginner', 'compound', 'strength', array['Segure um halter em cada mão com as palmas voltadas para o corpo.', 'Dobre levemente os joelhos e incline o tronco à frente, com as costas retas, até quase ficar paralelo ao chão.', 'Deixe os halteres pendurados com os braços estendidos.', 'Puxe os halteres até a lateral do tronco, mantendo os cotovelos rentes ao corpo.', 'Aperte as costas por um segundo no topo.', 'Desça os halteres devagar até estender os braços.']::text[], array['Arredondar as costas.', 'Subir o tronco durante a puxada.', 'Abrir demais os cotovelos para os lados.']::text[], array['Solte o ar ao puxar e puxe o ar ao descer.', 'Mantenha o tronco parado e o abdômen firme.', 'Olhe para o chão um pouco à frente para manter o pescoço neutro.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['lats', 'biceps', 'rear_delts', 'lower_back']::text[]) as m
 where e.slug = 'remada-curvada-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('remada-invertida', 'Remada invertida', 'Inverted Row', 'middle_back', 'body_weight', 'beginner', 'compound', 'strength', array['Coloque uma barra no suporte mais ou menos na altura da cintura.', 'Segure a barra com as mãos um pouco mais afastadas que os ombros e fique pendurado embaixo dela.', 'Deixe o corpo reto, com os calcanhares no chão e os braços estendidos.', 'Puxe o peito em direção à barra, dobrando os cotovelos e juntando as escápulas.', 'Faça uma pausa no topo e desça devagar até estender os braços.']::text[], array['Deixar o quadril cair durante a puxada.', 'Fazer só metade do movimento.', 'Puxar com o pescoço projetado para a frente.']::text[], array['Solte o ar ao puxar e puxe o ar ao descer.', 'Contraia glúteos e abdômen para manter o corpo em linha reta.', 'Quanto mais deitado o corpo, mais difícil fica o exercício.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['lats', 'biceps', 'rear_delts']::text[]) as m
 where e.slug = 'remada-invertida' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('extensao-lombar', 'Extensão lombar no banco romano', 'Hyperextensions (Back Extensions)', 'lower_back', 'other', 'beginner', 'isolation', 'strength', array['Deite de bruços no banco e prenda os tornozelos sob os apoios dos pés.', 'Ajuste o apoio para que fique na parte de cima das coxas, deixando o quadril livre para dobrar.', 'Com o corpo reto, cruze os braços à frente do peito.', 'Desça o tronco devagar dobrando o quadril, com as costas retas, até sentir alongar a parte de trás das coxas.', 'Suba o tronco até ficar alinhado com as pernas.']::text[], array['Arredondar as costas na descida.', 'Subir além da linha do corpo, arqueando demais a lombar.', 'Balançar o tronco para subir.']::text[], array['Puxe o ar ao descer e solte o ar ao subir.', 'Faça o movimento devagar e controlado.', 'Contraia os glúteos ao chegar em cima.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings']::text[]) as m
 where e.slug = 'extensao-lombar' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('levantamento-terra', 'Levantamento terra', 'Barbell Deadlift', 'lower_back', 'barbell', 'intermediate', 'compound', 'strength', array['Fique de pé com a barra sobre o meio dos pés.', 'Dobre os joelhos e incline o tronco, com as costas retas, e segure a barra com as mãos na largura dos ombros.', 'Empurre o chão com as pernas e suba o tronco ao mesmo tempo, mantendo a barra rente ao corpo.', 'Termine em pé, com o peito aberto e as escápulas para trás.', 'Desça a barra levando o quadril para trás e dobrando os joelhos, com as costas retas, até as anilhas tocarem o chão.']::text[], array['Arredondar a lombar ao puxar a barra.', 'Afastar a barra do corpo.', 'Subir o quadril antes do tronco.', 'Jogar o tronco para trás no final do movimento.']::text[], array['Puxe o ar e contraia o abdômen antes de tirar a barra do chão; solte o ar ao chegar em cima.', 'Mantenha o olhar à frente e o pescoço alinhado.', 'Pense em empurrar o chão com os pés, não em puxar com as costas.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings', 'quadriceps', 'traps', 'forearms']::text[]) as m
 where e.slug = 'levantamento-terra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('levantamento-terra-romeno', 'Levantamento terra romeno', 'Romanian Deadlift', 'hamstrings', 'barbell', 'intermediate', 'compound', 'strength', array['Segure a barra com as palmas para baixo e as mãos um pouco mais afastadas que os ombros.', 'Fique de pé com os joelhos levemente dobrados, canelas na vertical e costas retas.', 'Desça a barra rente às pernas levando o quadril para trás, sem dobrar mais os joelhos.', 'Desça até sentir alongar a parte de trás das coxas, sem arredondar as costas.', 'Suba empurrando o quadril para a frente até ficar totalmente em pé.']::text[], array['Arredondar as costas para descer mais.', 'Dobrar demais os joelhos, transformando em agachamento.', 'Afastar a barra das pernas.']::text[], array['Puxe o ar antes de descer e solte ao terminar a subida.', 'Mantenha o peito aberto durante todo o movimento.', 'Faça o movimento devagar e controlado.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'lower_back', 'forearms']::text[]) as m
 where e.slug = 'levantamento-terra-romeno' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('super-homem', 'Super-homem', 'Superman', 'lower_back', 'body_weight', 'beginner', 'compound', 'strength', array['Deite de bruços no chão ou em um colchonete com os braços estendidos à frente.', 'Levante ao mesmo tempo os braços, as pernas e o peito do chão.', 'Segure a posição por dois segundos.', 'Desça braços, pernas e peito devagar até a posição inicial.']::text[], array['Dar impulso em vez de subir com controle.', 'Jogar a cabeça para trás.', 'Dobrar os joelhos ao levantar as pernas.']::text[], array['Solte o ar ao subir e puxe o ar ao descer.', 'Mantenha o olhar para o chão e o pescoço alinhado.', 'Contraia os glúteos durante a subida.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings']::text[]) as m
 where e.slug = 'super-homem' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('bom-dia-com-barra', 'Bom dia com barra', 'Good Morning', 'hamstrings', 'barbell', 'intermediate', 'compound', 'strength', array['Ajuste a barra no suporte na altura dos ombros.', 'Apoie a barra na parte de trás dos ombros, junte as escápulas e dê um passo para trás.', 'Mantenha os joelhos levemente dobrados e as costas firmes.', 'Incline o tronco à frente levando o quadril para trás, até quase ficar paralelo ao chão.', 'Volte à posição inicial estendendo o quadril com glúteos e posteriores da coxa.']::text[], array['Arredondar as costas na descida.', 'Dobrar demais os joelhos.', 'Descer rápido demais e perder o controle da barra.']::text[], array['Puxe o ar antes de descer e solte ao subir.', 'Mantenha o pescoço alinhado com a coluna.', 'Comece com pouco peso até dominar o movimento.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'lower_back', 'abs']::text[]) as m
 where e.slug = 'bom-dia-com-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('swing-unilateral-com-kettlebell', 'Swing unilateral com kettlebell', 'One-Arm Kettlebell Swings', 'hamstrings', 'kettlebell', 'intermediate', 'compound', 'strength', array['Fique de pé com os pés um pouco mais afastados que os ombros e o kettlebell no chão à sua frente.', 'Leve o quadril para trás, com as costas retas, e segure a alça com uma mão.', 'Balance o kettlebell para trás entre as pernas.', 'Estenda o quadril com força para a frente, projetando o kettlebell até a altura do peito com o braço estendido.', 'Deixe o kettlebell descer e leve o quadril para trás para iniciar a próxima repetição.', 'Termine as repetições e troque de mão.']::text[], array['Levantar o kettlebell com o braço em vez de usar o quadril.', 'Agachar em vez de levar o quadril para trás.', 'Arredondar as costas na descida.', 'Deixar o tronco girar para o lado do braço.']::text[], array['Solte o ar com força ao estender o quadril e puxe o ar na descida.', 'Contraia glúteos e abdômen no topo do movimento.', 'Mantenha o ombro encaixado, longe da orelha.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'lower_back', 'front_delts', 'abs', 'forearms']::text[]) as m
 where e.slug = 'swing-unilateral-com-kettlebell' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('levantamento-terra-sumo', 'Levantamento terra sumô', 'Sumo Deadlift', 'hamstrings', 'barbell', 'intermediate', 'compound', 'strength', array['Fique com os pés bem afastados, pontas viradas para fora e a barra sobre o meio dos pés.', 'Dobre o quadril e segure a barra com os braços estendidos por dentro das pernas.', 'Desça o quadril, mantenha o peito para cima e o olhar à frente.', 'Empurre o chão afastando os joelhos e estenda quadril e joelhos para subir.', 'Quando a barra passar dos joelhos, leve o quadril à frente e junte as escápulas.', 'Desça a barra controlando o peso, levando o quadril para trás.']::text[], array['Deixar os joelhos caírem para dentro.', 'Arredondar a lombar ao tirar a barra do chão.', 'Afastar a barra do corpo.']::text[], array['Puxe o ar e firme o abdômen antes de subir; solte o ar ao chegar em cima.', 'Mantenha os joelhos na direção das pontas dos pés.', 'Deixe o peso nos calcanhares e no meio dos pés.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'quadriceps', 'adductors', 'lower_back', 'traps']::text[]) as m
 where e.slug = 'levantamento-terra-sumo' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('stiff-unilateral-com-kettlebell', 'Stiff unilateral com kettlebell', 'Kettlebell One-Legged Deadlift', 'hamstrings', 'kettlebell', 'intermediate', 'compound', 'strength', array['Segure o kettlebell com uma mão e apoie-se na perna do mesmo lado.', 'Mantenha o joelho de apoio levemente dobrado.', 'Incline o tronco à frente pelo quadril, levando a perna livre para trás para equilibrar.', 'Desça até o tronco ficar quase paralelo ao chão, com as costas retas.', 'Volte à posição em pé e troque de lado ao terminar as repetições.']::text[], array['Girar o quadril para o lado da perna livre.', 'Arredondar as costas para alcançar o chão.', 'Dobrar demais o joelho de apoio.']::text[], array['Puxe o ar ao descer e solte o ar ao subir.', 'Fixe o olhar em um ponto no chão para ajudar no equilíbrio.', 'Mantenha o quadril nivelado durante todo o movimento.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'lower_back']::text[]) as m
 where e.slug = 'stiff-unilateral-com-kettlebell' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('pular-corda', 'Pular corda', 'Rope Jumping', 'calves', 'other', 'intermediate', 'compound', 'cardio', array['Segure uma ponta da corda em cada mão com a corda atrás dos pés.', 'Gire a corda por cima da cabeça usando principalmente os punhos.', 'Quando a corda chegar ao chão à sua frente, salte por cima dela.', 'Aterrisse na ponta dos pés, com os joelhos levemente dobrados.', 'Mantenha um ritmo constante que consiga sustentar.']::text[], array['Saltar alto demais.', 'Girar a corda com os braços inteiros em vez dos punhos.', 'Aterrissar com os calcanhares e os joelhos travados.']::text[], array['Respire de forma ritmada, sem prender o ar.', 'Mantenha os cotovelos próximos ao corpo.', 'Faça saltos baixos, só o suficiente para a corda passar.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['quadriceps', 'hamstrings', 'forearms']::text[]) as m
 where e.slug = 'pular-corda' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('burpee', 'Burpee', null, 'quadriceps', 'body_weight', 'intermediate', 'compound', 'cardio', array['Fique em pé com os pés na largura dos ombros.', 'Agache e apoie as mãos no chão à frente dos pés.', 'Lance as pernas para trás e fique em posição de prancha.', 'Se quiser, faça uma flexão de braço.', 'Traga os pés de volta para perto das mãos.', 'Salte para cima estendendo os braços acima da cabeça.']::text[], array['Deixar o quadril cair na posição de prancha.', 'Aterrissar com os joelhos travados.', 'Perder a postura para acelerar o ritmo.']::text[], array['Solte o ar ao saltar e puxe o ar ao agachar.', 'Mantenha o abdômen firme ao lançar as pernas para trás.', 'Aterrisse suave, com os joelhos levemente dobrados.']::text[], 'own')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['chest', 'glutes', 'abs', 'calves']::text[]) as m
 where e.slug = 'burpee' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('polichinelo', 'Polichinelo', null, 'calves', 'body_weight', 'beginner', 'compound', 'cardio', array['Fique em pé com os pés juntos e os braços ao lado do corpo.', 'Salte abrindo as pernas e levando os braços pelas laterais até acima da cabeça.', 'Salte de novo fechando as pernas e descendo os braços ao lado do corpo.', 'Repita em ritmo constante.']::text[], array['Aterrissar com os calcanhares e os joelhos travados.', 'Fazer o movimento dos braços pela metade.', 'Curvar o tronco para a frente.']::text[], array['Respire de forma ritmada, sem prender o ar.', 'Aterrisse na ponta dos pés com os joelhos levemente dobrados.', 'Mantenha o abdômen firme e o tronco ereto.']::text[], 'own')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['side_delts', 'abductors', 'adductors']::text[]) as m
 where e.slug = 'polichinelo' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('agachamento-peso-do-corpo', 'Agachamento com peso do corpo', 'Bodyweight Squat', 'quadriceps', 'body_weight', 'beginner', 'compound', 'strength', array['Fique em pé com os pés na largura dos ombros e as pontas levemente para fora.', 'Estenda os braços à frente ou coloque as mãos atrás da cabeça.', 'Dobre joelhos e quadril ao mesmo tempo, levando o quadril para trás como se fosse sentar.', 'Desça até onde conseguir manter a coluna neutra e os calcanhares no chão.', 'Mantenha o peito aberto e os joelhos apontando na direção dos pés.', 'Empurre o chão com o pé inteiro e volte à posição inicial.']::text[], array['Deixar os joelhos caírem para dentro na subida.', 'Tirar os calcanhares do chão.', 'Arredondar as costas no fundo do movimento.']::text[], array['Puxe o ar ao descer e solte ao subir.', 'Distribua o peso entre calcanhar e meio do pé.', 'Contraia o abdômen para manter o tronco firme.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings', 'adductors']::text[]) as m
 where e.slug = 'agachamento-peso-do-corpo' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('agachamento-livre-com-barra', 'Agachamento livre com barra', 'Barbell Squat', 'quadriceps', 'barbell', 'beginner', 'compound', 'strength', array['Ajuste a barra no rack um pouco abaixo da altura dos ombros.', 'Entre sob a barra e apoie-a no alto das costas, logo abaixo do pescoço.', 'Segure a barra com as duas mãos e retire-a do rack estendendo pernas e tronco.', 'Dê um ou dois passos para trás e posicione os pés na largura dos ombros, pontas levemente para fora.', 'Desça dobrando joelhos e quadril, com o peito aberto e as costas retas, até as coxas passarem um pouco da linha paralela ao chão.', 'Empurre o chão com o pé inteiro e suba até estender as pernas.', 'Ao terminar a série, devolva a barra ao rack com cuidado.']::text[], array['Arredondar a lombar na descida.', 'Deixar os joelhos caírem para dentro.', 'Inclinar demais o tronco à frente e transformar o movimento em um bom-dia.', 'Tirar os calcanhares do chão.']::text[], array['Puxe o ar e trave o abdômen antes de descer; solte o ar ao passar a parte mais difícil da subida.', 'Use as travas de segurança do rack.', 'Mantenha o olhar à frente para ajudar a manter o tronco firme.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings', 'adductors', 'lower_back']::text[]) as m
 where e.slug = 'agachamento-livre-com-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('agachamento-goblet-com-kettlebell', 'Agachamento goblet com kettlebell', 'Goblet Squat', 'quadriceps', 'kettlebell', 'beginner', 'compound', 'strength', array['Fique em pé com os pés um pouco mais abertos que os ombros.', 'Segure o kettlebell pelas alças, junto ao peito, com os cotovelos apontando para baixo.', 'Desça dobrando joelhos e quadril, mantendo o peito aberto e as costas retas.', 'No fundo, faça uma breve pausa e use os cotovelos para afastar levemente os joelhos.', 'Empurre o chão e volte à posição inicial.']::text[], array['Afastar o kettlebell do peito e curvar o tronco.', 'Deixar os joelhos fecharem para dentro.', 'Tirar os calcanhares do chão no fundo.']::text[], array['Puxe o ar ao descer e solte ao subir.', 'Mantenha o kettlebell colado ao corpo durante todo o movimento.', 'Comece com carga leve até dominar a profundidade.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings', 'adductors', 'abs']::text[]) as m
 where e.slug = 'agachamento-goblet-com-kettlebell' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('agachamento-frontal-com-barra', 'Agachamento frontal com barra', 'Front Barbell Squat', 'quadriceps', 'barbell', 'advanced', 'compound', 'strength', array['Ajuste a barra no rack na altura do peito.', 'Apoie a barra na frente dos ombros, com os cotovelos altos e os braços quase paralelos ao chão.', 'Segure a barra com as mãos cruzadas ou com a pegada frontal e retire-a do rack.', 'Afaste-se do rack e posicione os pés na largura dos ombros, pontas levemente para fora.', 'Desça dobrando os joelhos, com o tronco o mais vertical possível, até as coxas passarem da linha paralela.', 'Empurre o chão com o meio do pé e suba mantendo os cotovelos altos.', 'Ao terminar, devolva a barra ao rack.']::text[], array['Deixar os cotovelos caírem e a barra rolar para frente.', 'Inclinar o tronco à frente na subida.', 'Olhar para baixo e perder o equilíbrio.']::text[], array['Puxe o ar e trave o abdômen antes de descer; solte o ar ao subir.', 'Pense em levar os cotovelos para cima ao sair do fundo.', 'Use as travas de segurança do rack.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings', 'abs', 'lower_back']::text[]) as m
 where e.slug = 'agachamento-frontal-com-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('agachamento-no-smith', 'Agachamento no Smith', 'Smith Machine Squat', 'quadriceps', 'smith', 'beginner', 'compound', 'strength', array['Ajuste a barra do Smith na altura dos ombros.', 'Entre sob a barra e apoie-a no alto das costas, logo abaixo do pescoço.', 'Segure a barra com as palmas para frente, destrave-a girando os punhos e estenda as pernas.', 'Posicione os pés na largura dos ombros, levemente à frente da linha do corpo.', 'Desça dobrando joelhos e quadril até as coxas ficarem um pouco abaixo da paralela.', 'Empurre a plataforma do chão e suba até estender as pernas.', 'Ao terminar, trave a barra girando os punhos.']::text[], array['Colocar os pés muito para trás e sobrecarregar os joelhos.', 'Arredondar a lombar no fundo.', 'Esquecer de travar a barra ao final da série.']::text[], array['Puxe o ar ao descer e solte ao subir.', 'Mantenha as costas apoiadas na barra e o abdômen firme.', 'Ajuste os batentes de segurança logo abaixo da sua profundidade.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings', 'adductors']::text[]) as m
 where e.slug = 'agachamento-no-smith' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('cadeira-extensora', 'Cadeira extensora', 'Leg Extensions', 'quadriceps', 'machine', 'beginner', 'isolation', 'strength', array['Ajuste o encosto para que os joelhos fiquem alinhados ao eixo da máquina.', 'Ajuste o rolo para que fique sobre a parte de baixo da canela, logo acima dos pés.', 'Sente-se com as costas apoiadas e segure as alças laterais.', 'Estenda as pernas até ficarem retas, sem tirar o quadril do banco.', 'Segure um segundo com o quadríceps contraído.', 'Desça devagar até a posição inicial, sem deixar o peso bater.']::text[], array['Dar impulso com o corpo para subir o peso.', 'Deixar a carga cair rápido na volta.', 'Tirar o quadril do banco no final da extensão.']::text[], array['Solte o ar ao estender as pernas e puxe ao descer.', 'Controle a descida em cerca de dois segundos.', 'Mantenha as pontas dos pés voltadas para cima.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('leg-press-45', 'Leg press 45°', 'Leg Press', 'quadriceps', 'machine', 'beginner', 'compound', 'strength', array['Sente-se no leg press com as costas e o quadril bem apoiados no encosto.', 'Coloque os pés na plataforma na largura dos ombros.', 'Empurre a plataforma e solte as travas de segurança, sem travar os joelhos.', 'Desça a plataforma devagar até os joelhos formarem cerca de 90 graus.', 'Empurre com o pé inteiro, com mais força nos calcanhares, e volte à posição inicial.', 'Ao terminar, recoloque as travas de segurança antes de sair.']::text[], array['Travar os joelhos no topo do movimento.', 'Descer demais e tirar o quadril do encosto.', 'Deixar os joelhos fecharem para dentro ao empurrar.']::text[], array['Puxe o ar ao descer e solte ao empurrar.', 'Mantenha a lombar colada no encosto o tempo todo.', 'Segure as alças laterais para estabilizar o corpo.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings', 'adductors']::text[]) as m
 where e.slug = 'leg-press-45' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('agachamento-hack', 'Agachamento hack', 'Hack Squat', 'quadriceps', 'machine', 'beginner', 'compound', 'strength', array['Apoie as costas no encosto da máquina e encaixe os ombros sob as almofadas.', 'Posicione os pés na plataforma na largura dos ombros, pontas levemente para fora.', 'Segure as alças laterais e solte as travas de segurança.', 'Estenda as pernas sem travar os joelhos; esta é a posição inicial.', 'Desça devagar dobrando os joelhos até as coxas passarem um pouco da paralela.', 'Empurre a plataforma com o pé inteiro e volte à posição inicial.', 'Ao terminar, recoloque as travas de segurança.']::text[], array['Tirar as costas ou o quadril do encosto no fundo.', 'Travar os joelhos no topo.', 'Tirar os calcanhares da plataforma.']::text[], array['Puxe o ar ao descer e solte ao subir.', 'Mantenha a cabeça apoiada e o olhar à frente.', 'Controle a descida em vez de deixar a máquina cair.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings', 'adductors']::text[]) as m
 where e.slug = 'agachamento-hack' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('avanco-com-halteres', 'Avanço com halteres', 'Dumbbell Lunges', 'quadriceps', 'dumbbell', 'beginner', 'compound', 'strength', array['Fique em pé com o tronco ereto, segurando um halter em cada mão ao lado do corpo.', 'Dê um passo largo à frente com a perna direita.', 'Desça o corpo dobrando os dois joelhos até o joelho de trás quase tocar o chão.', 'Mantenha a canela da frente perto da vertical e o tronco ereto.', 'Empurre o chão com o calcanhar da frente e volte à posição inicial.', 'Complete as repetições e troque de perna.']::text[], array['Dar um passo curto demais e jogar o joelho muito à frente.', 'Inclinar o tronco para frente.', 'Deixar o joelho da frente cair para dentro.']::text[], array['Puxe o ar ao descer e solte ao subir.', 'Mantenha os ombros para trás e o abdômen firme.', 'Deixe os pés afastados na largura do quadril para ganhar equilíbrio.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings', 'adductors']::text[]) as m
 where e.slug = 'avanco-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('avanco-caminhando', 'Avanço caminhando', 'Bodyweight Walking Lunge', 'quadriceps', 'body_weight', 'beginner', 'compound', 'strength', array['Fique em pé com os pés na largura dos ombros e as mãos na cintura.', 'Dê um passo à frente com uma perna e desça dobrando os dois joelhos.', 'Desça até o joelho de trás quase tocar o chão, com o tronco ereto.', 'Empurre com o calcanhar da frente e estenda os joelhos para subir.', 'Traga o pé de trás à frente e faça o próximo passo com a outra perna.']::text[], array['Deixar o joelho da frente passar muito à frente do pé ou cair para dentro.', 'Inclinar o tronco à frente.', 'Bater o joelho de trás no chão.']::text[], array['Puxe o ar ao descer e solte ao subir.', 'Olhe à frente para manter o equilíbrio.', 'Faça passos de tamanho constante durante toda a série.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings', 'adductors']::text[]) as m
 where e.slug = 'avanco-caminhando' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('afundo-com-salto', 'Afundo com salto', 'Split Squats', 'quadriceps', 'body_weight', 'intermediate', 'compound', 'plyometrics', array['Fique em pé com os pés na largura do quadril.', 'Salte para a posição de afundo, com uma perna à frente e a outra atrás, dobrando os joelhos.', 'Assim que chegar embaixo, inverta a direção e salte para cima.', 'No ar, troque a posição das pernas.', 'Aterrisse de forma suave já no afundo com a outra perna à frente e repita.']::text[], array['Aterrissar com as pernas rígidas.', 'Deixar o joelho da frente cair para dentro na aterrissagem.', 'Perder o tronco ereto e jogar o peso à frente.']::text[], array['Solte o ar no salto e puxe o ar na aterrissagem.', 'Aterrisse com a ponta e o meio do pé, amortecendo com os joelhos.', 'Use os braços para ajudar no impulso.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings', 'calves']::text[]) as m
 where e.slug = 'afundo-com-salto' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('subida-no-banco-com-halteres', 'Subida no banco com halteres', 'Dumbbell Step Ups', 'quadriceps', 'dumbbell', 'intermediate', 'compound', 'strength', array['Fique em pé de frente para um banco ou caixa, com um halter em cada mão ao lado do corpo.', 'Apoie o pé direito inteiro em cima do banco.', 'Empurre com o calcanhar direito e suba estendendo quadril e joelho.', 'Leve o pé esquerdo para cima do banco.', 'Desça primeiro com o pé esquerdo, controlando com a perna direita, e depois traga o pé direito.', 'Complete as repetições e troque de perna.']::text[], array['Dar impulso com a perna de baixo.', 'Usar um banco alto demais e curvar o tronco.', 'Deixar o joelho de apoio cair para dentro.']::text[], array['Solte o ar ao subir e puxe ao descer.', 'Mantenha o tronco ereto e o olhar à frente.', 'Desça devagar para aproveitar a fase de controle.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings', 'calves']::text[]) as m
 where e.slug = 'subida-no-banco-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('mesa-flexora', 'Mesa flexora', 'Lying Leg Curls', 'hamstrings', 'machine', 'beginner', 'isolation', 'strength', array['Ajuste a máquina à sua altura e deite de bruços com os joelhos logo após a borda do banco.', 'Posicione o rolo na parte de trás das pernas, um pouco acima dos calcanhares.', 'Segure as alças, com as pernas estendidas e o quadril apoiado.', 'Flexione os joelhos levando o rolo o mais perto possível dos glúteos.', 'Segure um segundo na contração.', 'Volte devagar até estender as pernas.']::text[], array['Tirar o quadril do banco ao puxar.', 'Usar impulso e deixar o peso cair na volta.', 'Fazer amplitude curta.']::text[], array['Solte o ar ao flexionar e puxe ao estender.', 'Pressione o quadril contra o banco o tempo todo.', 'Controle a volta em cerca de dois segundos.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['calves']::text[]) as m
 where e.slug = 'mesa-flexora' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('cadeira-flexora', 'Cadeira flexora', 'Seated Leg Curl', 'hamstrings', 'machine', 'beginner', 'isolation', 'strength', array['Ajuste a máquina para que os joelhos fiquem alinhados ao eixo e sente-se com as costas no encosto.', 'Apoie a parte de trás da perna, logo acima dos calcanhares, sobre o rolo.', 'Prenda a almofada sobre as coxas, logo acima dos joelhos, e segure as alças.', 'Com as pernas estendidas, flexione os joelhos puxando o rolo para baixo e para trás.', 'Segure um segundo na contração.', 'Volte devagar até estender as pernas.']::text[], array['Deixar a almofada das coxas frouxa.', 'Mexer o tronco para ajudar a puxar.', 'Soltar o peso rápido na volta.']::text[], array['Solte o ar ao flexionar e puxe ao voltar.', 'Mantenha as costas apoiadas no encosto.', 'Faça a amplitude completa sem bater o peso.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['calves']::text[]) as m
 where e.slug = 'cadeira-flexora' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('stiff-com-halteres', 'Stiff com halteres', 'Stiff-Legged Dumbbell Deadlift', 'hamstrings', 'dumbbell', 'beginner', 'compound', 'strength', array['Fique em pé com um halter em cada mão, na frente das coxas.', 'Afaste os pés na largura do quadril e dobre levemente os joelhos.', 'Mantendo os joelhos fixos e as costas retas, leve o quadril para trás e desça os halteres junto às pernas.', 'Desça até sentir alongar a parte de trás das coxas, sem arredondar as costas.', 'Estenda o quadril e volte à posição em pé.']::text[], array['Arredondar as costas na descida.', 'Afastar os halteres das pernas.', 'Dobrar os joelhos e transformar em agachamento.']::text[], array['Puxe o ar ao descer e solte ao subir.', 'Pense em levar o quadril para trás, não o tronco para baixo.', 'Contraia os glúteos ao chegar no topo.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'lower_back']::text[]) as m
 where e.slug = 'stiff-com-halteres' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('elevacao-gluteo-isquiotibial', 'Elevação glúteo-isquiotibial', 'Glute Ham Raise', 'hamstrings', 'machine', 'intermediate', 'compound', 'strength', array['Ajuste o aparelho ao seu corpo, com os joelhos logo atrás da almofada.', 'Prenda os pés entre os rolos, apoiados na plataforma, e deite de bruços.', 'Comece com o tronco para baixo e as costas retas.', 'Empurre os pés contra a plataforma e flexione os joelhos para levantar o corpo.', 'Suba até o tronco ficar na vertical.', 'Volte devagar à posição inicial, controlando a descida.']::text[], array['Dobrar o quadril em vez de flexionar os joelhos.', 'Descer sem controle.', 'Arredondar as costas.']::text[], array['Solte o ar ao subir e puxe ao descer.', 'Mantenha glúteos e abdômen contraídos durante todo o movimento.', 'Use as mãos ou um elástico para ajudar no início, se necessário.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'calves', 'lower_back']::text[]) as m
 where e.slug = 'elevacao-gluteo-isquiotibial' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('elevacao-pelvica-com-barra', 'Elevação pélvica com barra', 'Barbell Hip Thrust', 'glutes', 'barbell', 'intermediate', 'compound', 'strength', array['Sente no chão com um banco logo atrás e a barra carregada sobre as pernas.', 'Role a barra até ficar sobre o quadril; use uma proteção na barra.', 'Apoie a parte de baixo das escápulas na borda do banco e os pés no chão, na largura do quadril.', 'Empurre o chão com os pés e eleve o quadril até o tronco ficar alinhado com as coxas.', 'Contraia os glúteos no topo por um segundo.', 'Desça o quadril de forma controlada e repita.']::text[], array['Arquear a lombar no topo em vez de estender o quadril.', 'Deixar os pés longe demais e sentir mais a parte de trás da coxa.', 'Abrir ou fechar os joelhos durante a subida.']::text[], array['Solte o ar ao subir e puxe ao descer.', 'Mantenha o queixo levemente recolhido e o olhar à frente.', 'No topo, as canelas devem ficar próximas da vertical.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['hamstrings', 'quadriceps', 'adductors']::text[]) as m
 where e.slug = 'elevacao-pelvica-com-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('ponte-de-gluteos', 'Ponte de glúteos', 'Butt Lift (Bridge)', 'glutes', 'body_weight', 'beginner', 'isolation', 'strength', array['Deite de costas no chão, com os joelhos dobrados e os braços ao lado do corpo.', 'Apoie os pés no chão, afastados na largura do quadril.', 'Empurre com os calcanhares e eleve o quadril até alinhar joelhos, quadril e ombros.', 'Segure um segundo no topo contraindo os glúteos.', 'Desça devagar até a posição inicial.']::text[], array['Arquear a lombar no topo.', 'Empurrar com a ponta dos pés.', 'Deixar os joelhos abrirem ou fecharem.']::text[], array['Solte o ar ao subir e puxe ao descer.', 'Contraia o abdômen para manter a coluna neutra.', 'Concentre a força nos glúteos no topo do movimento.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['hamstrings']::text[]) as m
 where e.slug = 'ponte-de-gluteos' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('ponte-de-gluteos-com-barra', 'Ponte de glúteos com barra', 'Barbell Glute Bridge', 'glutes', 'barbell', 'intermediate', 'compound', 'strength', array['Sente no chão com a barra carregada sobre as pernas; use uma proteção na barra.', 'Role a barra até ficar sobre o quadril e deite de costas no chão.', 'Dobre os joelhos e apoie os pés no chão, na largura do quadril.', 'Empurre com os calcanhares e eleve o quadril até alinhar joelhos, quadril e ombros.', 'Contraia os glúteos no topo por um segundo.', 'Desça de forma controlada e repita.']::text[], array['Arquear a lombar no topo.', 'Deixar a barra rolar para fora do quadril.', 'Descer o quadril de forma brusca.']::text[], array['Solte o ar ao subir e puxe ao descer.', 'Segure a barra com as mãos para mantê-la estável.', 'Mantenha o abdômen firme durante todo o movimento.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['hamstrings', 'quadriceps']::text[]) as m
 where e.slug = 'ponte-de-gluteos-com-barra' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('coice-de-gluteo-no-solo', 'Coice de glúteo no solo', 'Glute Kickback', 'glutes', 'body_weight', 'beginner', 'isolation', 'strength', array['Fique em quatro apoios no colchonete, com as mãos abaixo dos ombros e os joelhos abaixo do quadril.', 'Mantenha os joelhos dobrados a 90 graus e o olhar para o chão, um pouco à frente.', 'Eleve a perna direita para trás e para cima até a coxa ficar alinhada com as costas, mantendo o joelho dobrado.', 'Segure um segundo contraindo o glúteo.', 'Volte à posição inicial e repita com a outra perna, alternando.']::text[], array['Arquear a lombar ao subir a perna.', 'Girar o quadril para o lado.', 'Fazer o movimento rápido, com balanço.']::text[], array['Solte o ar ao subir a perna e puxe ao descer.', 'Contraia o abdômen para manter as costas retas.', 'Pense em empurrar o calcanhar em direção ao teto.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['hamstrings']::text[]) as m
 where e.slug = 'coice-de-gluteo-no-solo' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('coice-de-gluteo-na-polia', 'Coice de glúteo na polia', 'One-Legged Cable Kickback', 'glutes', 'cable', 'intermediate', 'isolation', 'strength', array['Prenda uma tornozeleira na polia baixa e encaixe-a no tornozelo.', 'Fique de frente para a máquina, a cerca de 60 cm, segurando a estrutura para apoio.', 'Com joelhos e quadril levemente dobrados e o abdômen firme, leve a perna para trás em arco, o mais alto que for confortável.', 'Contraia o glúteo por um segundo no ponto mais alto.', 'Volte devagar à posição inicial, resistindo à tração do cabo.', 'Complete as repetições e troque de perna.']::text[], array['Arquear a lombar para subir mais a perna.', 'Inclinar o tronco e girar o quadril.', 'Deixar o cabo puxar a perna de volta sem controle.']::text[], array['Solte o ar ao levar a perna para trás e puxe ao voltar.', 'Mantenha o quadril de frente para a máquina.', 'Prefira amplitude controlada a carga alta.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['hamstrings']::text[]) as m
 where e.slug = 'coice-de-gluteo-na-polia' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('cadeira-abdutora', 'Cadeira abdutora', 'Thigh Abductor', 'abductors', 'machine', 'beginner', 'isolation', 'strength', array['Escolha a carga e sente na cadeira abdutora com as costas apoiadas.', 'Posicione a parte de fora dos joelhos contra as almofadas e segure as alças laterais.', 'Afaste as pernas empurrando as almofadas para fora.', 'Segure um segundo na posição aberta.', 'Volte devagar até a posição inicial, sem deixar o peso bater.']::text[], array['Balançar o tronco para ajudar a abrir as pernas.', 'Soltar o peso rápido na volta.', 'Fazer amplitude curta.']::text[], array['Solte o ar ao abrir as pernas e puxe ao fechar.', 'Mantenha o tronco parado e o abdômen firme.', 'Controle a volta em cerca de dois segundos.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes']::text[]) as m
 where e.slug = 'cadeira-abdutora' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('cadeira-adutora', 'Cadeira adutora', 'Thigh Adductor', 'adductors', 'machine', 'beginner', 'isolation', 'strength', array['Escolha a carga e sente na cadeira adutora com as costas apoiadas.', 'Posicione a parte de dentro dos joelhos contra as almofadas e segure as alças laterais.', 'Feche as pernas empurrando as almofadas uma em direção à outra.', 'Segure um segundo na posição fechada.', 'Volte devagar até a posição inicial, sem deixar o peso bater.']::text[], array['Fazer movimentos bruscos, com tranco.', 'Abrir as pernas além do confortável na volta.', 'Mexer o tronco durante o movimento.']::text[], array['Solte o ar ao fechar as pernas e puxe ao abrir.', 'Mantenha o tronco parado e o abdômen firme.', 'Ajuste a abertura inicial a uma amplitude que você controle.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes', 'hamstrings']::text[]) as m
 where e.slug = 'cadeira-adutora' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('caminhada-monstro-com-elastico', 'Caminhada monstro com elástico', 'Monster Walk', 'abductors', 'band', 'beginner', 'compound', 'strength', array['Coloque um elástico em volta dos tornozelos e outro em volta dos joelhos.', 'Fique com os pés na largura dos ombros, de modo que os elásticos fiquem esticados.', 'Dobre levemente joelhos e quadril, com o tronco ereto.', 'Dê passos curtos à frente, alternando os pés e mantendo a tensão nos elásticos.', 'Depois de alguns passos, caminhe para trás até o ponto de partida.']::text[], array['Deixar os joelhos fecharem para dentro.', 'Juntar os pés e perder a tensão dos elásticos.', 'Balançar o tronco de um lado para o outro.']::text[], array['Respire de forma contínua, soltando o ar a cada passo.', 'Mantenha a semiflexão dos joelhos durante toda a série.', 'Faça passos curtos e controlados.']::text[], 'free-exercise-db')
on conflict do nothing;
insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(array['glutes']::text[]) as m
 where e.slug = 'caminhada-monstro-com-elastico' and m <> e.primary_muscle
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('panturrilha-em-pe', 'Panturrilha em pé', 'Standing Calf Raises', 'calves', 'machine', 'beginner', 'isolation', 'strength', array['Ajuste as almofadas da máquina à sua altura.', 'Encaixe os ombros sob as almofadas e apoie a ponta dos pés no degrau, com os calcanhares para fora.', 'Estenda quadril e joelhos até ficar em pé, mantendo os joelhos levemente dobrados.', 'Suba os calcanhares o mais alto possível, contraindo a panturrilha.', 'Segure um segundo no topo.', 'Desça devagar até sentir a panturrilha alongar.']::text[], array['Dobrar e estender os joelhos para ajudar a subir.', 'Fazer amplitude curta, sem alongar embaixo.', 'Quicar no fundo do movimento.']::text[], array['Solte o ar ao subir e puxe ao descer.', 'Mantenha os joelhos fixos durante toda a série.', 'Faça uma pausa breve embaixo antes de subir.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('panturrilha-sentado', 'Panturrilha sentado', 'Seated Calf Raise', 'calves', 'machine', 'beginner', 'isolation', 'strength', array['Sente na máquina e apoie a ponta dos pés na plataforma, com os calcanhares para fora.', 'Ajuste a almofada para que fique sobre a parte de baixo das coxas.', 'Suba um pouco os calcanhares e solte a trava de segurança.', 'Desça os calcanhares devagar até sentir a panturrilha alongar.', 'Suba os calcanhares o mais alto possível e segure um segundo.', 'Ao terminar, recoloque a trava de segurança.']::text[], array['Fazer amplitude curta.', 'Quicar no fundo do movimento.', 'Usar o tronco para empurrar a almofada.']::text[], array['Puxe o ar ao descer e solte ao subir.', 'Mantenha as mãos sobre a almofada para estabilizar.', 'Controle a descida em cerca de dois segundos.']::text[], 'free-exercise-db')
on conflict do nothing;

insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values ('panturrilha-no-leg-press', 'Panturrilha no leg press', 'Calf Press On The Leg Press Machine', 'calves', 'machine', 'beginner', 'isolation', 'strength', array['Sente no leg press e coloque os pés na plataforma na largura dos ombros.', 'Estenda as pernas sem travar os joelhos; se a máquina permitir, mantenha as travas de segurança fechadas.', 'Deslize os pés até apoiar só a ponta e a parte da frente dos pés na borda de baixo da plataforma.', 'Empurre a plataforma estendendo os tornozelos o máximo possível.', 'Segure um segundo no topo.', 'Volte devagar, deixando os calcanhares descerem até alongar a panturrilha.']::text[], array['Dobrar os joelhos durante o movimento.', 'Apoiar os pés muito alto e escorregar da plataforma.', 'Fazer amplitude curta.']::text[], array['Solte o ar ao empurrar e puxe ao voltar.', 'Mantenha os joelhos fixos, levemente dobrados.', 'Use carga que permita controlar a descida.']::text[], 'free-exercise-db')
on conflict do nothing;


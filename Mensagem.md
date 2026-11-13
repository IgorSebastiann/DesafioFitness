Projeto: Desafio Fitness — Competição Fitness de Casal

Quero que você desenvolva um aplicativo web completo chamado Desafio Fitness, voltado para uma competição de atividades físicas entre duas pessoas (casal).

O objetivo é transformar a prática de exercícios em uma competição saudável, divertida e motivadora, na qual cada participante acumula pontos conforme realiza atividades físicas. Ao final de cada semana e de cada mês, o participante com mais pontos vence.

Não quero apenas um protótipo visual. Quero um sistema funcional, com banco de dados, autenticação, cadastro de atividades, comprovação dos exercícios e ranking atualizado automaticamente.

1. Identidade visual e interface

Crie uma interface moderna, esportiva e minimalista.

Referências visuais:

\* Design inspirado em Strava, Nike Run Club e aplicativos modernos de fitness.

\* Interface mobile-first, totalmente responsiva.

\* Tema escuro como padrão.

\* Fundo preto ou grafite.

\* Elementos em laranja ou verde-limão para destacar pontuações.

\* Cards com cantos arredondados.

\* Ícones modernos.

\* Animações leves para mudanças de pontuação e conquistas.

\* Navegação simples e intuitiva.

O aplicativo deve parecer um produto comercial pronto para uso, não um painel administrativo genérico.

2. Autenticação e participantes

O sistema terá inicialmente dois participantes.

Implementar:

\* Cadastro e login com e-mail e senha.

\* Recuperação de senha.

\* Perfil individual.

\* Foto de perfil.

\* Nome e apelido.

\* Histórico individual de atividades.

\* Total de pontos acumulados.

Cada usuário deve visualizar as próprias informações e as informações públicas do adversário.

Os dois participantes devem pertencer ao mesmo desafio.

3. Dashboard principal

Após o login, apresentar uma tela inicial com:

Placar principal

Exibir os dois participantes lado a lado, mostrando:

\* Foto de perfil.

\* Nome.

\* Pontuação da semana.

\* Pontuação do mês.

\* Posição atual.

\* Diferença de pontos entre os participantes.

Destacar visualmente quem está vencendo.

Estatísticas

Exibir:

\* Total de atividades realizadas.

\* Total de pontos.

\* Quantidade de corridas.

\* Quantidade de treinos de musculação.

\* Dias ativos.

\* Maior sequência de dias ativos.

Ranking

Criar um ranking semanal e mensal, com alternância entre os períodos.

Últimas atividades

Mostrar as últimas atividades cadastradas pelos dois participantes, com foto ou vídeo de comprovação.

4. Cadastro de atividades físicas

Criar uma tela para registrar uma nova atividade.

Campos:

\* Tipo de atividade.

\* Data da atividade.

\* Horário.

\* Duração em minutos.

\* Distância em quilômetros (opcional).

\* Descrição ou observação.

\* Upload de foto ou vídeo como comprovação.

Categorias disponíveis inicialmente:

Atividade	Pontos

Musculação	1

Corrida	1

Caminhada	1

Bicicleta	1

Natação	1

Funcional	1

Futebol	1

Vôlei	1

Basquete	1

Pular corda	1

Pilates	1

Dança	1

Os tipos de atividade e suas pontuações devem ser configuráveis pelo administrador.

Regras de pontuação

\* Cada atividade válida vale 1 ponto.

\* Limite de 2 pontos por participante por dia.

\* Não permitir cadastrar a mesma atividade duas vezes.

\* O sistema deve impedir que uma atividade ultrapasse o limite diário.

\* O administrador pode configurar duração mínima por modalidade.

\* Sugestões iniciais de duração mínima:

    \* Musculação: 30 minutos.

    \* Corrida: 15 minutos.

    \* Caminhada: 30 minutos.

    \* Bicicleta: 30 minutos.

    \* Natação: 20 minutos.

    \* Pular corda: 15 minutos.

    \* Demais modalidades: 20 minutos.

O sistema deve calcular automaticamente os pontos válidos.

5. Comprovação e validação das atividades

Toda atividade deve ter uma comprovação.

Implementar:

\* Upload de imagens.

\* Upload de vídeos curtos.

\* Visualização da comprovação.

\* Data e hora do registro.

\* Identificação do participante.

Criar um sistema de validação:

Uma atividade pode ter os seguintes status:

\* Pendente.

\* Aprovada.

\* Rejeitada.

O outro participante poderá visualizar a atividade e aprovar ou contestar sua validade.

Somente atividades aprovadas devem contar para o ranking.

O administrador pode aprovar ou rejeitar qualquer atividade.

Registrar quem aprovou ou rejeitou e quando isso aconteceu.

Não permitir que um usuário aprove a própria atividade.

6. Sistema de ranking e períodos

Criar dois rankings:

Ranking semanal

\* Começa na segunda-feira.

\* Termina no domingo.

\* Zera automaticamente na semana seguinte.

\* Mantém o histórico das semanas anteriores.

Ranking mensal

\* Considera todas as atividades aprovadas do mês.

\* Reinicia a contagem no primeiro dia de cada mês.

\* Mantém o histórico dos meses anteriores.

Criar uma tela de histórico com:

\* Participantes.

\* Pontuação final.

\* Vencedor.

\* Quantidade de atividades.

\* Período disputado.

Importante: zerar o placar não significa apagar atividades ou registros antigos. Todo o histórico deve permanecer salvo.

7. Premiações e desafios

Criar uma seção de premiações.

Permitir configurar:

\* Prêmio semanal.

\* Prêmio mensal.

\* Descrição da recompensa.

\* Valor ou observação.

\* Histórico de vencedores.

Exemplos:

\* Pagar um hambúrguer.

\* Pagar um jantar.

\* Pagar um açaí.

\* Escolher o próximo passeio.

\* Organizar um encontro surpresa.

O sistema deve identificar automaticamente o vencedor de cada período.

Em caso de empate, exibir empate e não declarar um vencedor.

8. Calendário de atividades

Criar um calendário mensal mostrando os dias em que cada participante realizou exercícios.

Utilizar cores diferentes para cada participante.

Ao clicar em um dia, mostrar:

\* Atividades realizadas.

\* Horários.

\* Pontuação.

\* Comprovações.

Também mostrar os dias sem atividade.

9. Conquistas e gamificação

Criar medalhas e conquistas para aumentar a motivação.

Exemplos:

\* Primeira atividade.

\* Primeira corrida.

\* 5 dias ativos.

\* 10 atividades realizadas.

\* 20 pontos acumulados.

\* 3 dias consecutivos de atividade.

\* Campeão da semana.

\* Campeão do mês.

Exibir as conquistas no perfil de cada participante.

Criar notificações dentro do aplicativo quando:

\* Uma atividade for cadastrada.

\* Uma atividade for aprovada.

\* Uma atividade for rejeitada.

\* Um participante assumir a liderança.

\* O ranking semanal for encerrado.

\* Uma conquista for desbloqueada.

10. Painel administrativo

Criar uma área administrativa protegida.

Permitir:

\* Editar participantes.

\* Alterar pontuações.

\* Criar e editar modalidades.

\* Configurar duração mínima.

\* Alterar limite diário de pontos.

\* Configurar premiações.

\* Aprovar ou rejeitar atividades.

\* Consultar histórico.

\* Corrigir registros, mantendo log de auditoria.

11. Banco de dados

Utilizar Supabase como backend.

Implementar:

\* Supabase Auth para autenticação.

\* PostgreSQL para banco de dados.

\* Supabase Storage para fotos e vídeos.

\* Row Level Security (RLS) para proteger os dados.

Criar tabelas organizadas para:

\* users/profiles

\* challenges

\* challenge_participants

\* activities

\* activity_categories

\* activity_approvals

\* awards

\* weekly_results

\* monthly_results

\* achievements

\* user_achievements

\* notifications

\* audit_logs

Garantir que cada usuário só possa editar os próprios registros e que as regras de pontuação sejam validadas no backend, não apenas no frontend.

12. Tecnologias

Utilizar preferencialmente:

\* Next.js com App Router.

\* TypeScript.

\* Tailwind CSS.

\* shadcn/ui.

\* Lucide Icons.

\* Supabase.

\* Recharts para gráficos.

Organizar o projeto com componentes reutilizáveis e código limpo.

13. Responsividade e experiência mobile

O aplicativo será utilizado principalmente em celulares.

Portanto:

\* Criar navegação inferior no mobile.

\* Criar menu lateral no desktop.

\* Botões grandes e fáceis de clicar.

\* Formulários simples.

\* Upload de fotos diretamente pela câmera do celular.

\* Otimização das imagens.

\* Carregamento rápido.

\* Estados de carregamento e mensagens de erro.

\* Feedback visual ao cadastrar uma atividade.

14. Segurança e integridade

Regras fundamentais:

\* Nunca confiar na pontuação enviada pelo frontend.

\* Calcular pontos no backend.

\* Impedir duplicidade de atividades.

\* Validar duração mínima.

\* Impedir que atividades ultrapassem o limite diário.

\* Restringir edição de atividades de outros participantes.

\* Garantir que atividades rejeitadas não contem pontos.

\* Manter histórico de alterações.

\* Proteger arquivos enviados ao Storage.

15. Entrega do projeto

Quero que você desenvolva o sistema por completo.

Antes de começar:

1. Analise a arquitetura necessária.

2. Defina a estrutura de pastas.

3. Planeje o banco de dados.

4. Identifique as variáveis de ambiente necessárias.

Depois:

1. Implemente o frontend.

2. Implemente o backend.

3. Configure autenticação.

4. Crie as tabelas e políticas RLS.

5. Implemente upload de comprovantes.

6. Implemente a pontuação e os rankings.

7. Faça testes das regras principais.

8. Prepare o projeto para deploy.

Não utilize dados falsos como se fossem reais. Caso o Supabase ainda não esteja configurado, crie a estrutura de integração e explique exatamente como conectar.

Crie também um arquivo [README.md](http://README.md) com:

\* Instalação.

\* Configuração do Supabase.

\* Variáveis de ambiente.

\* Execução local.

\* Deploy.

\* Criação dos primeiros participantes.

\* Configuração do primeiro desafio.

IMPORTANTE: Não quero apenas telas bonitas ou botões sem funcionalidade. Cada funcionalidade apresentada na interface deve estar realmente implementada e integrada ao banco de dados.

Comece planejando a arquitetura e depois implemente o projeto em etapas, validando cada etapa antes de avançar.  
  
![](orca-paste-1794512690042-7e5e8792-49f1-4219-8080-0e40d07cceff.png)

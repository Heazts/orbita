import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como a Órbita trata (ou melhor, não trata) seus dados: sem cadastro, tudo fica no seu navegador.",
  alternates: { canonical: "/privacidade" },
}

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade" updated="2 de agosto de 2026">
      <p>
        A Órbita é um agregador de notícias que reúne manchetes de feeds RSS públicos e da busca do
        Google News. Este é um projeto pessoal e gratuito. Nossa premissa é simples: coletar o mínimo
        possível — na prática, quase nada.
      </p>

      <div>
        <h2>Não pedimos dados pessoais</h2>
        <p>
          Não há cadastro, login, nome, e-mail ou senha. Você não cria conta para usar a Órbita e não
          nos fornece nenhuma informação pessoal.
        </p>
      </div>

      <div>
        <h2>O que fica salvo (só no seu navegador)</h2>
        <p>
          Alguns recursos guardam informações localmente, usando o <code>localStorage</code> do seu
          navegador. Esses dados <strong>nunca são enviados para nós</strong> nem para terceiros —
          ficam apenas no seu dispositivo:
        </p>
        <ul>
          <li>Notícias favoritas que você salva;</li>
          <li>Seu histórico de buscas recentes;</li>
          <li>A preferência de tema (claro, escuro ou o do sistema);</li>
          <li>Suas preferências de conteúdo (tom das notícias, avisos, animações, atalhos);</li>
          <li>
            No Termo: as tentativas do jogo do dia e suas estatísticas (partidas, vitórias e
            sequência);
          </li>
          <li>No Sudoku: seu melhor tempo em cada nível.</li>
        </ul>
        <p>
          O histórico de busca tem um botão para apagar direto no painel de{" "}
          <strong>Preferências</strong>. Para apagar tudo de uma vez, incluindo favoritos e
          estatísticas dos jogos, limpe os dados do site nas configurações do seu navegador.
        </p>
      </div>

      <div>
        <h2>Métricas de uso e desempenho</h2>
        <p>
          Usamos o Vercel Analytics para entender, de forma <strong>agregada e anônima</strong>, quantas
          pessoas visitam a Órbita e quais páginas são mais acessadas, e o Vercel Speed Insights para
          medir a velocidade real de carregamento das páginas — o tempo até a primeira imagem aparecer,
          a estabilidade do layout e a resposta ao toque. Nenhum dos dois usa cookies de rastreamento
          nem identifica você individualmente.
        </p>
        <p>
          Os dois carregam do próprio domínio da Órbita, não de um servidor de terceiros, e é para lá
          que as medições vão.
        </p>
      </div>

      <div>
        <h2>Endereço IP e proteção contra abuso</h2>
        <p>
          Quando o app busca notícias na nossa API, seu endereço IP é usado momentaneamente apenas para
          limitar as requisições a cerca de 30 por minuto e evitar abuso. Esse controle é feito em
          memória, o registro expira sozinho ao fim de cada janela de um minuto, e não guardamos
          nenhum histórico persistente do seu IP.
        </p>
      </div>

      <div>
        <h2>Conteúdo de terceiros</h2>
        <p>
          As notícias, imagens e links vêm dos veículos originais (BBC Brasil, Agência Brasil, G1,
          InfoMoney, NASA e outros — a lista completa está no{" "}
          <a href="https://github.com/Heazts/orbita#fontes" target="_blank" rel="noopener noreferrer">
            repositório
          </a>
          ). As imagens <strong>não</strong> são buscadas pelo seu navegador nos servidores desses
          veículos: elas passam por um proxy da própria Órbita, então esses sites não recebem o seu
          endereço IP nem sabem que você viu aquela matéria. Ao clicar em uma notícia, aí sim você vai
          para o site do veículo, que tem sua própria política de privacidade.
        </p>
      </div>

      <div>
        <h2>Cookies</h2>
        <p>
          A Órbita <strong>não usa cookies</strong> — nem de rastreamento, nem de publicidade, nem de
          sessão. Não há nenhum, porque não há login nem nada que precise ser lembrado entre
          dispositivos.
        </p>
      </div>

      <div>
        <h2>Alterações e contato</h2>
        <p>
          Podemos atualizar esta política; a data no topo indica a última revisão. Dúvidas ou pedidos
          podem ser enviados pelo{" "}
          <a href="https://github.com/Heazts/orbita" target="_blank" rel="noopener noreferrer">
            repositório do projeto no GitHub
          </a>
          .
        </p>
      </div>
    </LegalPage>
  )
}

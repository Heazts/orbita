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
    <LegalPage title="Política de Privacidade" updated="24 de julho de 2026">
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
          <li>A preferência de tema (claro ou escuro);</li>
          <li>Suas preferências de conteúdo (tom das notícias, avisos, animações).</li>
        </ul>
        <p>
          Você pode apagar tudo a qualquer momento limpando os dados do site nas configurações do seu
          navegador.
        </p>
      </div>

      <div>
        <h2>Métricas de uso</h2>
        <p>
          Usamos o Vercel Analytics para entender, de forma <strong>agregada e anônima</strong>, quantas
          pessoas visitam a Órbita e quais páginas são mais acessadas. Ele não usa cookies de
          rastreamento e não identifica você individualmente.
        </p>
      </div>

      <div>
        <h2>Endereço IP e proteção contra abuso</h2>
        <p>
          Quando o app busca notícias na nossa API, seu endereço IP é usado momentaneamente apenas para
          limitar a quantidade de requisições por minuto (evitar abuso). Esse controle é feito em
          memória e não guardamos um registro persistente do seu IP.
        </p>
      </div>

      <div>
        <h2>Conteúdo de terceiros</h2>
        <p>
          As notícias, imagens e links vêm dos veículos originais (BBC, DW, Agência Brasil, G1, NASA e
          outros). As imagens são carregadas diretamente dos servidores dessas fontes com a política
          <code> no-referrer</code>, então não informamos a elas de onde você veio. Ao clicar em uma
          notícia, você vai para o site do veículo, que tem sua própria política de privacidade.
        </p>
      </div>

      <div>
        <h2>Cookies</h2>
        <p>A Órbita não usa cookies de rastreamento ou de publicidade.</p>
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

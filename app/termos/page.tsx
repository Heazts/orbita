import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "As regras simples para usar a Órbita, um agregador gratuito de notícias de fontes públicas.",
  alternates: { canonical: "/termos" },
}

export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso" updated="2 de agosto de 2026">
      <p>
        Ao usar a Órbita, você concorda com estes termos. Eles são curtos e diretos de propósito.
      </p>

      <div>
        <h2>O que é a Órbita</h2>
        <p>
          A Órbita é um serviço gratuito que <strong>agrega</strong> manchetes de fontes jornalísticas
          públicas (via RSS) e da busca do Google News, reunindo tudo em um só lugar. A Órbita não
          produz as notícias: o conteúdo, os títulos e as imagens pertencem aos veículos originais, que
          são sempre creditados e linkados.
        </p>
        <p>
          Além do painel de notícias, o site tem uma <strong>área do estudante</strong> e uma seção de{" "}
          <strong>jogos</strong> (Termo e Sudoku), que funcionam inteiramente no seu navegador e não
          exigem cadastro.
        </p>
      </div>

      <div>
        <h2>Conteúdo de terceiros</h2>
        <p>
          Não temos controle editorial sobre o que as fontes publicam e não garantimos a exatidão, a
          atualidade ou a disponibilidade de nenhuma notícia. A responsabilidade pelo conteúdo é do
          veículo que o publicou. Quando uma fonte fica indisponível, a Órbita avisa quais falharam e
          segue funcionando com as demais; se todas ficarem fora do ar, a página diz isso claramente —
          nunca preenchemos o espaço com manchetes inventadas.
        </p>
      </div>

      <div>
        <h2>Uso aceitável</h2>
        <ul>
          <li>Use a Órbita para fins pessoais e informativos;</li>
          <li>
            Não tente sobrecarregar ou abusar da API de notícias — há um limite de cerca de 30
            requisições por minuto por endereço IP, e passar dele devolve erro até a janela virar;
          </li>
          <li>Não use o serviço para qualquer finalidade ilegal.</li>
        </ul>
      </div>

      <div>
        <h2>Sem garantias</h2>
        <p>
          O serviço é oferecido &quot;como está&quot;, sem garantias de funcionamento contínuo ou livre
          de erros. Podemos alterar, pausar ou encerrar a Órbita a qualquer momento. Na medida permitida
          pela lei, não nos responsabilizamos por danos decorrentes do uso ou da indisponibilidade do
          serviço ou do conteúdo de terceiros.
        </p>
      </div>

      <div>
        <h2>Propriedade</h2>
        <p>
          O código da Órbita é aberto sob a{" "}
          <a
            href="https://github.com/Heazts/orbita/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
          >
            licença MIT
          </a>
          . A marca e a identidade &quot;Órbita&quot; são do projeto. O conteúdo das notícias permanece
          de propriedade dos respectivos veículos.
        </p>
      </div>

      <div>
        <h2>Falhas de segurança</h2>
        <p>
          Se você encontrar uma vulnerabilidade, avise em particular pelo{" "}
          <a
            href="https://github.com/Heazts/orbita/security/advisories/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            canal de avisos de segurança do repositório
          </a>{" "}
          em vez de abrir uma issue pública. O processo está descrito no{" "}
          <a
            href="https://github.com/Heazts/orbita/blob/main/SECURITY.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            SECURITY.md
          </a>
          .
        </p>
      </div>

      <div>
        <h2>Alterações e contato</h2>
        <p>
          Estes termos podem ser atualizados; a data no topo indica a última revisão. Fale com a gente
          pelo{" "}
          <a href="https://github.com/Heazts/orbita" target="_blank" rel="noopener noreferrer">
            repositório do projeto no GitHub
          </a>
          .
        </p>
      </div>
    </LegalPage>
  )
}

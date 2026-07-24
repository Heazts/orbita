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
    <LegalPage title="Termos de Uso" updated="24 de julho de 2026">
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
      </div>

      <div>
        <h2>Conteúdo de terceiros</h2>
        <p>
          Não temos controle editorial sobre o que as fontes publicam e não garantimos a exatidão, a
          atualidade ou a disponibilidade de nenhuma notícia. A responsabilidade pelo conteúdo é do
          veículo que o publicou. Quando uma fonte fica indisponível, a Órbita avisa de forma discreta e
          segue funcionando com as demais.
        </p>
      </div>

      <div>
        <h2>Uso aceitável</h2>
        <ul>
          <li>Use a Órbita para fins pessoais e informativos;</li>
          <li>Não tente sobrecarregar, automatizar em excesso ou abusar da API de notícias;</li>
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
          O código da Órbita é aberto sob a licença MIT. A marca e a identidade &quot;Órbita&quot; são do
          projeto. O conteúdo das notícias permanece de propriedade dos respectivos veículos.
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

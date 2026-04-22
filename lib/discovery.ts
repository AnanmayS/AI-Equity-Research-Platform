export type DiscoveryIdea = {
  ticker: string;
  companyName: string;
  why: string;
  peers: string[];
};

export type DiscoveryBasket = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  bestFor: string;
  ideas: DiscoveryIdea[];
};

export const discoveryBaskets: DiscoveryBasket[] = [
  {
    slug: "optical-transceivers",
    title: "Optical Transceivers",
    shortTitle: "Optical",
    description:
      "Companies tied to data-center networking, fiber optics, lasers, and high-speed optical modules.",
    bestFor: "AI data-center buildouts and bandwidth bottlenecks",
    ideas: [
      {
        ticker: "AAOI",
        companyName: "Applied Optoelectronics",
        why: "High-growth optical module name with big upside potential and volatile margins.",
        peers: ["LITE", "COHR", "CIEN", "FN"]
      },
      {
        ticker: "LITE",
        companyName: "Lumentum",
        why: "Larger optical components peer exposed to cloud, telecom, and laser demand.",
        peers: ["AAOI", "COHR", "CIEN", "FN"]
      },
      {
        ticker: "COHR",
        companyName: "Coherent",
        why: "Photonics and optical materials company that can benefit from AI networking demand.",
        peers: ["AAOI", "LITE", "CIEN", "FN"]
      },
      {
        ticker: "CIEN",
        companyName: "Ciena",
        why: "Networking equipment company tied to carrier and data-center bandwidth upgrades.",
        peers: ["AAOI", "LITE", "COHR", "JNPR"]
      }
    ]
  },
  {
    slug: "ai-infrastructure",
    title: "AI Infrastructure",
    shortTitle: "AI Infra",
    description:
      "Compute, data-center, and infrastructure names that can move with AI capacity demand.",
    bestFor: "Investors looking beyond the largest chipmakers",
    ideas: [
      {
        ticker: "NBIS",
        companyName: "Nebius Group",
        why: "AI cloud infrastructure story with very high expectations and incomplete profitability proof.",
        peers: ["CRWV", "IREN", "CORZ", "CIFR"]
      },
      {
        ticker: "SMCI",
        companyName: "Super Micro Computer",
        why: "AI server exposure with strong growth but margin and execution risk.",
        peers: ["DELL", "HPE", "NTAP", "PSTG"]
      },
      {
        ticker: "IREN",
        companyName: "IREN",
        why: "Power and data-center infrastructure angle with crypto and AI compute optionality.",
        peers: ["NBIS", "CORZ", "CIFR", "HUT"]
      },
      {
        ticker: "CORZ",
        companyName: "Core Scientific",
        why: "Infrastructure-heavy compute name where utilization and power economics matter.",
        peers: ["IREN", "CIFR", "HUT", "MARA"]
      }
    ]
  },
  {
    slug: "voice-ai-software",
    title: "Voice AI & Applied Software",
    shortTitle: "Voice AI",
    description:
      "Smaller AI software names where revenue growth, customer concentration, and profitability matter.",
    bestFor: "Sorting AI hype from measurable business traction",
    ideas: [
      {
        ticker: "SOUN",
        companyName: "SoundHound AI",
        why: "Voice AI growth story with high revenue growth, high valuation, and profitability risk.",
        peers: ["BBAI", "AI", "PLTR", "PATH"]
      },
      {
        ticker: "BBAI",
        companyName: "BigBear.ai",
        why: "Government and enterprise AI analytics name with turnaround characteristics.",
        peers: ["SOUN", "AI", "PLTR", "PATH"]
      },
      {
        ticker: "AI",
        companyName: "C3.ai",
        why: "Enterprise AI software peer with cleaner scale than many microcap AI names.",
        peers: ["SOUN", "BBAI", "PLTR", "PATH"]
      },
      {
        ticker: "PATH",
        companyName: "UiPath",
        why: "Automation software peer that helps benchmark AI software valuation and margins.",
        peers: ["SOUN", "AI", "PLTR", "BBAI"]
      }
    ]
  },
  {
    slug: "semiconductor-value-chain",
    title: "Semiconductor Value Chain",
    shortTitle: "Semis",
    description:
      "Chip, component, and hardware names that sit around the AI and compute value chain.",
    bestFor: "Comparing growth, margins, and valuation across hardware exposure",
    ideas: [
      {
        ticker: "NVDA",
        companyName: "Nvidia",
        why: "The benchmark AI chip leader for comparing every other compute story.",
        peers: ["AMD", "AVGO", "INTC", "QCOM"]
      },
      {
        ticker: "AMD",
        companyName: "Advanced Micro Devices",
        why: "AI accelerator challenger with CPU/GPU exposure and valuation sensitivity.",
        peers: ["NVDA", "INTC", "QCOM", "AVGO"]
      },
      {
        ticker: "AVGO",
        companyName: "Broadcom",
        why: "Semiconductor and infrastructure software compounder with AI networking exposure.",
        peers: ["NVDA", "AMD", "QCOM", "TXN"]
      },
      {
        ticker: "SMCI",
        companyName: "Super Micro Computer",
        why: "Server hardware name that can amplify AI infrastructure cycles.",
        peers: ["DELL", "HPE", "NTAP", "PSTG"]
      }
    ]
  }
];

export function getBasket(slug: string) {
  return discoveryBaskets.find((basket) => basket.slug === slug) || null;
}

export function getIdea(ticker: string) {
  const normalized = ticker.toUpperCase();
  for (const basket of discoveryBaskets) {
    const idea = basket.ideas.find((candidate) => candidate.ticker === normalized);
    if (idea) return { basket, idea };
  }
  return null;
}

export function getSimilarIdeas(ticker: string) {
  const match = getIdea(ticker);
  if (!match) return [];

  return match.basket.ideas.filter((idea) => idea.ticker !== match.idea.ticker).slice(0, 3);
}

export function searchDiscovery(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return discoveryBaskets;

  return discoveryBaskets.filter((basket) => {
    const basketText = `${basket.title} ${basket.description} ${basket.bestFor}`.toLowerCase();
    const ideaText = basket.ideas
      .map((idea) => `${idea.ticker} ${idea.companyName} ${idea.why}`)
      .join(" ")
      .toLowerCase();

    return basketText.includes(normalized) || ideaText.includes(normalized);
  });
}

export function ideaReportHref(idea: DiscoveryIdea) {
  const peers = idea.peers.join(",");
  return `/report/${idea.ticker}${peers ? `?peers=${encodeURIComponent(peers)}` : ""}`;
}

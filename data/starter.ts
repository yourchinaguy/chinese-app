// Curated starter content. Each piece is ready to import as a deck, or to
// simplify with Claude.ai (Max Plan) first for a learner at a lower level.
// Add entries over time; this is meant to grow as Jan curates.

export type StarterArticle = {
  slug: string;
  title: string;
  titleEn: string;
  suggestedHsk: 1 | 2 | 3 | 4 | 5 | 6;
  tags: string[];
  source?: { name: string; url?: string };
  summary: string;
  text: string;
};

export const starterArticles: StarterArticle[] = [
  {
    slug: "cafe-business-meeting",
    title: "咖啡馆的商务会面",
    titleEn: "A business meeting at a café",
    suggestedHsk: 4,
    tags: ["business", "daily", "dialogue"],
    summary:
      "Short dialogue between two people discussing a project proposal over coffee. Practical business Chinese vocabulary in context.",
    text: `今天下午三点，我在咖啡馆见了一位新客户。她是一家新创公司的市场经理，希望我们能帮助她们做品牌推广。
我们一边喝咖啡一边聊她们的项目。她告诉我，她们的产品主要面向年轻人，所以需要一个更有创意的营销方案。
我问她预算大概是多少，她说公司给了十万元做三个月的测试。我觉得这个数字还算合理，所以答应下周给她一份详细的计划书。
离开之前，我们约好下周五再见一次面，讨论具体的合作细节。`,
  },

  {
    slug: "wechat-mini-programs",
    title: "微信小程序如何改变了中国商业",
    titleEn: "How WeChat Mini Programs changed Chinese commerce",
    suggestedHsk: 5,
    tags: ["business", "technology", "trend"],
    summary:
      "Short explainer on why Mini Programs (小程序) became such a dominant channel for Chinese businesses. Real business-tech vocabulary.",
    text: `微信小程序自从2017年推出以来，已经彻底改变了中国的商业模式。和传统的应用程序不同，小程序不需要下载安装，用户只要扫一扫二维码或者在微信里搜索，就可以直接使用。
对商家来说，开发小程序的成本比开发独立App低得多。更重要的是，小程序可以利用微信庞大的用户基础，让品牌直接触达消费者。许多餐厅、零售店、甚至政府服务都已经推出了自己的小程序。
分析人士认为，小程序的成功不仅改变了中国互联网生态，也让微信从一个聊天工具变成了一个连接一切的超级平台。未来几年，小程序很可能继续成为中国商业数字化的重要工具。`,
  },

  {
    slug: "dji-founder-interview-excerpt",
    title: "大疆创始人访谈节选：关于创新与挑战",
    titleEn: "DJI founder interview excerpt: on innovation and challenges",
    suggestedHsk: 6,
    tags: ["business", "technology", "interview"],
    summary:
      "Excerpt from an interview with Frank Wang (汪滔), DJI founder. Discusses the company's approach to innovation and global competition. **This one is dense — consider using the Claude.ai simplify button to adapt it to your level before importing.**",
    text: `在一次采访中，大疆创新的创始人汪滔谈到了公司成立以来所面临的挑战。他表示，从一开始，大疆就决定走一条与众不同的道路——不仅仅是模仿国外的技术，而是要在无人机领域建立自己的核心竞争力。
汪滔认为，中国制造业长期以来被贴上"低端模仿"的标签，但真正的创新需要耐心和长期的投入。大疆在成立的头几年几乎没有盈利，所有的资金都投入到了研发当中。正是这种坚持，让大疆逐渐在全球消费级无人机市场占据了领先地位。
然而，随着国际竞争日趋激烈，加上地缘政治因素的影响，大疆也面临着前所未有的外部压力。汪滔坦言，未来的挑战不仅来自技术层面，更来自如何在复杂的全球环境中保持企业的独立性和创造力。他强调，无论环境如何变化，大疆都会坚持以产品和用户体验为核心，做出真正有价值的东西。`,
  },
];

export function getStarterArticle(slug: string): StarterArticle | null {
  return starterArticles.find((a) => a.slug === slug) ?? null;
}

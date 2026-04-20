// Known Chinese proper nouns — companies, people, products, places that the
// segmenter tends to split into character pieces (e.g. 大疆 → 大 + 疆). When we
// see the substring in the input text, we merge it into one token and tag it
// with the English gloss.
//
// Feel free to extend: add "汉字": "English label" pairs.

export const STATIC_PROPER_NOUNS: Record<string, string> = {
  // Tech / internet companies
  大疆: "DJI",
  阿里巴巴: "Alibaba",
  腾讯: "Tencent",
  百度: "Baidu",
  华为: "Huawei",
  小米: "Xiaomi",
  字节跳动: "ByteDance",
  美团: "Meituan",
  京东: "JD.com",
  拼多多: "Pinduoduo",
  滴滴: "Didi",
  微信: "WeChat",
  微博: "Weibo",
  支付宝: "Alipay",
  淘宝: "Taobao",
  抖音: "Douyin",
  小红书: "Xiaohongshu (RedNote)",
  知乎: "Zhihu",
  哔哩哔哩: "Bilibili",
  网易: "NetEase",
  新浪: "Sina",
  搜狐: "Sohu",

  // Founders / well-known business figures
  马云: "Jack Ma (Alibaba founder)",
  马化腾: "Pony Ma (Tencent founder)",
  任正非: "Ren Zhengfei (Huawei founder)",
  李彦宏: "Robin Li (Baidu founder)",
  雷军: "Lei Jun (Xiaomi founder)",
  汪滔: "Frank Wang (DJI founder)",
  张一鸣: "Zhang Yiming (ByteDance founder)",
  王兴: "Wang Xing (Meituan founder)",
  刘强东: "Richard Liu (JD founder)",
  黄峥: "Colin Huang (Pinduoduo founder)",

  // Cities that often appear untokenized (and aren't in HSK by themselves)
  深圳: "Shenzhen",
  杭州: "Hangzhou",
  广州: "Guangzhou",
  成都: "Chengdu",
  重庆: "Chongqing",
  西安: "Xi'an",
  苏州: "Suzhou",

  // Countries / regions mentioned often in business contexts
  美国: "USA",
  日本: "Japan",
  韩国: "Korea",
  中国: "China",
  欧洲: "Europe",
  东南亚: "Southeast Asia",
};

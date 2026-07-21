export interface ShopLinkAttribution {
  productUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign?: string | null;
  id?: string;
}

export function buildAttributedShopUrl(link: ShopLinkAttribution): string {
  const url = new URL(link.productUrl);
  url.searchParams.set("utm_source", link.utmSource);
  url.searchParams.set("utm_medium", link.utmMedium);
  if (link.utmCampaign) {
    url.searchParams.set("utm_campaign", link.utmCampaign);
  }
  if (link.id) {
    url.searchParams.set("utm_content", link.id);
  }
  return url.toString();
}

export function withAttributedUrl<T extends ShopLinkAttribution>(link: T) {
  return { ...link, attributedUrl: buildAttributedShopUrl(link) };
}

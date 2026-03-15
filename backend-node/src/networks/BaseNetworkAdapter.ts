export interface NetworkAdapter {
  fetchOffers(credentials: any): Promise<any[]>
  buildTrackingLink(offer: any, userId: number, clickId: string): string
}

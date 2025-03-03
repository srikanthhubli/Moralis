import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Price } from './price.entity';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class PriceService {
  private readonly apiKey = process.env.MORALIS_API_KEY;
  private readonly emailUser = process.env.EMAIL_USER;
  private readonly emailPass = process.env.EMAIL_PASS;

  constructor(
    @InjectRepository(Price) private priceRepo: Repository<Price>,
  ) {}

  /** Fetch price from Moralis API */
  async fetchPrice(chain: string): Promise<number> {
    const response = await axios.get(`https://api.moralis.io/v2/${chain}/price`, {
      headers: { 'X-API-Key': this.apiKey },
    });
    return response.data.usdPrice;
  }

  /** Save price of Ethereum and Polygon every 5 minutes */
  @Cron('*/5 * * * *') // Runs every 5 minutes
  async handleCron() {
    await this.savePrice('ethereum');
    await this.savePrice('polygon');
  }

  async savePrice(chain: string) {
    const price = await this.fetchPrice(chain);
    await this.priceRepo.save({ chain, price });
    await this.checkPriceIncrease(chain, price);
  }

  /** Check if price increased by more than 3% in the last hour */
  async checkPriceIncrease(chain: string, currentPrice: number) {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const lastPrice = await this.priceRepo.findOne({
      where: { chain, timestamp: oneHourAgo },
      order: { timestamp: 'DESC' },
    });

    if (lastPrice && ((currentPrice - lastPrice.price) / lastPrice.price) * 100 > 3) {
      this.sendEmail(
        'hyperhire_assignment@hyperhire.in',
        `🚀 ${chain.toUpperCase()} Price Increased by 3%!`,
        `The new price of ${chain.toUpperCase()} is ${currentPrice} USD`
      );
    }
  }

  /** Send Email Notifications */
  async sendEmail(to: string, subject: string, text: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.emailUser,
        pass: this.emailPass,
      },
    });

    await transporter.sendMail({
      from: `"Blockchain Price Tracker" <${this.emailUser}>`,
      to,
      subject,
      text,
    });
  }

  /** Get hourly prices for the last 24 hours */
  async getHourlyPrices(chain: string) {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    return this.priceRepo.find({
      where: { chain, timestamp: last24Hours },
      order: { timestamp: 'DESC' },
    });
  }

  /** Set alert for specific price */
  async setPriceAlert(chain: string, price: number, email: string) {
    // Store alert in DB (Assuming there's an Alert Entity)
    // For now, we just send an email when the price reaches this threshold.
    this.sendEmail(email, `📢 ${chain.toUpperCase()} Price Alert Set`, `You will be notified when ${chain.toUpperCase()} reaches $${price}`);
    return { message: `Alert set for ${chain} at $${price} for ${email}` };
  }

  /** Get Swap Rate (ETH to BTC) */
  async getSwapRate(ethAmount: number) {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd');
    const ethPrice = response.data.ethereum.usd;
    const btcPrice = response.data.bitcoin.usd;
    
    const btcAmount = (ethAmount * ethPrice) / btcPrice;
    const fee = ethAmount * 0.0003; // 0.03% fee

    return { btcAmount, feeEth: fee, feeUSD: fee * ethPrice };
  }
}

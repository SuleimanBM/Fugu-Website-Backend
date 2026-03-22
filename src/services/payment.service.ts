import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PaymentService {
  private readonly base = 'https://api.paystack.co';

  private get headers() {
    return {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  /** Initialize a Paystack transaction. Returns { authorization_url, reference, ... } */
  async initialize(input: { orderId: string; email: string; amount: number }) {
    try {
      const res = await axios.post(
        `${this.base}/transaction/initialize`,
        {
          email: input.email,
          amount: Math.round(input.amount * 100), // kobo
          metadata: { orderId: input.orderId },
          callback_url: `${process.env.FRONTEND_URL}/checkout/callback`,
        },
        { headers: this.headers },
      );
      return res.data.data as {
        authorization_url: string;
        access_code: string;
        reference: string;
      };
    } catch {
      throw new BadRequestException('Payment initialization failed');
    }
  }

  /** Verify a transaction by reference */
  async verify(reference: string) {
    try {
      const res = await axios.get(
        `${this.base}/transaction/verify/${reference}`,
        {
          headers: this.headers,
          timeout: 15000,
        },
      );
      return res.data.data as {
        status: string;
        reference: string;
        amount: number;
        metadata: Record<string, any>;
      };
    } catch {
      throw new BadRequestException('Payment verification failed');
    }
  }
}

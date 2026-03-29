import { Router, Request, Response } from 'express';
import { getMTNToken, sendMTNPayment } from '../services/mtn.service';

const router = Router();

// Test MTN token generation
router.get('/test-mtn-token', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Testing MTN token generation...');
    const token = await getMTNToken();
    console.log('✅ MTN token generated successfully');
    res.json({ 
      success: true,
      token,
      message: 'MTN token generated successfully'
    });
  } catch (error: any) {
    console.error('❌ MTN token generation failed:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Test MTN payment/disbursement
router.post('/test-payment', async (req: Request, res: Response) => {
  try {
    const { amount, phone } = req.body;

    if (!amount || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Amount and phone are required'
      });
    }

    console.log('🧪 Testing MTN payment...');
    const referenceId = await sendMTNPayment(amount, phone);
    
    res.json({ 
      success: true,
      referenceId,
      message: 'MTN payment sent successfully',
      amount,
      phone,
      currency: 'XAF'
    });
  } catch (error: any) {
    console.error('❌ MTN payment failed:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;

import axios from 'axios';

export const sendOrangeMoney = async ({
  amount,
  phone,
  reference
}: {
  amount: number;
  phone: string;
  reference: string;
}) => {
  try {
    console.log('💸 INITIATING ORANGE MONEY PAYMENT');
    console.log(`   Amount: ${amount} XAF`);
    console.log(`   Phone: ${phone}`);
    console.log(`   Reference: ${reference}`);

    const response = await axios.post(
      process.env.ORANGE_API_URL!,
      {
        amount,
        currency: "XAF",
        recipient: {
          type: "MSISDN",
          value: phone
        },
        reference
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ORANGE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log("✅ ORANGE PAYOUT SUCCESSFUL");
    console.log("ORANGE PAYOUT RESPONSE:", response.data);

    return {
      success: true,
      data: response.data
    };

  } catch (error: any) {
    console.error("❌ ORANGE PAYOUT ERROR:", error.response?.data || error.message);

    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
};

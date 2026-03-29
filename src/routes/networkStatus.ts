import { Router, Response } from 'express';
import axios from 'axios';
import { authMiddleware, adminOnlyMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

interface NetworkStatus {
  network: string;
  configured: boolean;
  status: 'active' | 'error' | 'unconfigured';
  message: string;
  lastChecked: string;
}

async function checkDigistore24(): Promise<NetworkStatus> {
  const apiKey = process.env.DIGISTORE_API_KEY;
  
  if (!apiKey) {
    return {
      network: 'digistore24',
      configured: false,
      status: 'unconfigured',
      message: 'DIGISTORE_API_KEY not set',
      lastChecked: new Date().toISOString()
    };
  }

  try {
    const response = await axios.get(
      'https://www.digistore24.com/api/call/getUserInfo',
      {
        headers: { 'X-DS-API-KEY': apiKey, 'Accept': 'application/json' },
        timeout: 10000
      }
    );
    
    return {
      network: 'digistore24',
      configured: true,
      status: response.data?.result === 'success' ? 'active' : 'error',
      message: response.data?.result === 'success' ? 'Connected' : 'API returned non-success',
      lastChecked: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      network: 'digistore24',
      configured: true,
      status: 'error',
      message: error.message || 'Connection failed',
      lastChecked: new Date().toISOString()
    };
  }
}

async function checkAwin(): Promise<NetworkStatus> {
  const token = process.env.AWIN_TOKEN;
  const publisherId = process.env.AWIN_PUBLISHER_ID;
  
  if (!token || !publisherId) {
    return {
      network: 'awin',
      configured: false,
      status: 'unconfigured',
      message: !token ? 'AWIN_TOKEN not set' : 'AWIN_PUBLISHER_ID not set',
      lastChecked: new Date().toISOString()
    };
  }

  try {
    const response = await axios.get(
      `https://api.awin.com/publishers/${publisherId}/programmes`,
      {
        params: { relationship: 'joined', countryCode: 'US' },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      }
    );
    
    const programCount = Array.isArray(response.data) ? response.data.length : 0;
    
    return {
      network: 'awin',
      configured: true,
      status: 'active',
      message: `Connected - ${programCount} joined programmes`,
      lastChecked: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      network: 'awin',
      configured: true,
      status: 'error',
      message: error.response?.status === 401 ? 'Invalid token' : error.message,
      lastChecked: new Date().toISOString()
    };
  }
}

async function checkMyLead(): Promise<NetworkStatus> {
  const apiKey = process.env.MYLEAD_API_KEY;
  
  if (!apiKey) {
    return {
      network: 'mylead',
      configured: false,
      status: 'unconfigured',
      message: 'MYLEAD_API_KEY not set',
      lastChecked: new Date().toISOString()
    };
  }

  try {
    const response = await axios.get(
      'https://api.mylead.global/v1/offers',
      {
        params: { limit: 1 },
        headers: { 'X-Api-Key': apiKey },
        timeout: 10000
      }
    );
    
    return {
      network: 'mylead',
      configured: true,
      status: response.data ? 'active' : 'error',
      message: response.data ? 'Connected' : 'No response data',
      lastChecked: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      network: 'mylead',
      configured: true,
      status: 'error',
      message: error.response?.status === 401 ? 'Invalid API key' : error.message,
      lastChecked: new Date().toISOString()
    };
  }
}

async function checkPartnerStack(): Promise<NetworkStatus> {
  const apiKey = process.env.PARTNERSTACK_API_KEY;
  
  if (!apiKey) {
    return {
      network: 'partnerstack',
      configured: false,
      status: 'unconfigured',
      message: 'PARTNERSTACK_API_KEY not set',
      lastChecked: new Date().toISOString()
    };
  }

  try {
    const response = await axios.get(
      'https://api.partnerstack.com/api/v2/partnerships',
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000
      }
    );
    
    return {
      network: 'partnerstack',
      configured: true,
      status: 'active',
      message: 'Connected',
      lastChecked: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      network: 'partnerstack',
      configured: true,
      status: 'error',
      message: error.response?.status === 401 ? 'Invalid or expired API key' : error.message,
      lastChecked: new Date().toISOString()
    };
  }
}

router.get('/status', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [digistore, awin, mylead] = await Promise.all([
      checkDigistore24(),
      checkAwin(),
      checkMyLead()
    ]);

    // PartnerStack is disabled
    const partnerstackDisabled: NetworkStatus = {
      network: 'partnerstack',
      configured: false,
      status: 'unconfigured',
      message: 'Network disabled by admin',
      lastChecked: new Date().toISOString()
    };

    const networks = [digistore, awin, mylead, partnerstackDisabled];
    const activeCount = networks.filter(n => n.status === 'active').length;
    const errorCount = networks.filter(n => n.status === 'error').length;
    const unconfiguredCount = networks.filter(n => n.status === 'unconfigured').length;

    res.json({
      summary: {
        total: networks.length,
        active: activeCount,
        errors: errorCount,
        unconfigured: unconfiguredCount,
        disabled: ['partnerstack']
      },
      networks,
      requiredSecrets: {
        digistore24: ['DIGISTORE_API_KEY'],
        awin: ['AWIN_TOKEN', 'AWIN_PUBLISHER_ID'],
        mylead: ['MYLEAD_API_KEY']
      }
    });
  } catch (error) {
    console.error('Network status error:', error);
    res.status(500).json({ error: 'Failed to check network status' });
  }
});

router.get('/health', async (req, res) => {
  const configured = {
    digistore24: !!process.env.DIGISTORE_API_KEY,
    awin: !!(process.env.AWIN_TOKEN && process.env.AWIN_PUBLISHER_ID),
    mylead: !!process.env.MYLEAD_API_KEY
  };

  const configuredCount = Object.values(configured).filter(Boolean).length;

  res.json({
    status: configuredCount > 0 ? 'operational' : 'degraded',
    networks: configured,
    disabled_networks: ['partnerstack'],
    configured_count: configuredCount,
    total_networks: 3
  });
});

export default router;

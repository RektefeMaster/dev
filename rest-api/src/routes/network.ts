import express from 'express';
const router = express.Router();

// Railway IP adresini öğrenmek için endpoint
router.get('/ip', async (req, res) => {
  try {
    // Railway'in outbound IP adresini öğrenmek için external servis kullan
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    
    res.json({
      success: true,
      railwayOutboundIP: data.ip,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      headers: {
        'x-forwarded-for': req.get('x-forwarded-for'),
        'x-real-ip': req.get('x-real-ip'),
        'cf-connecting-ip': req.get('cf-connecting-ip')
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

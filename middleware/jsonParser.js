// Custom JSON parser middleware to handle various JSON parsing issues
const express = require('express');

const customJsonParser = (options = {}) => {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      return next();
    }

    let data = '';
    let isJson = false;

    // Check content type
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      isJson = true;
    }

    req.on('data', chunk => {
      data += chunk;
    });

    req.on('end', () => {
      if (!isJson || !data) {
        req.body = {};
        return next();
      }

      try {
        // Try to parse as JSON
        let parsed;
        
        // First attempt: Direct JSON parse
        try {
          parsed = JSON.parse(data);
        } catch (firstError) {
          console.log('🔄 First JSON parse failed, trying alternative methods...');
          
          // Second attempt: Handle double-encoded JSON
          try {
            // Remove any extra quotes or escaping
            let cleanedData = data;
            
            // Handle cases where JSON might be double-encoded
            if (cleanedData.startsWith('"') && cleanedData.endsWith('"')) {
              cleanedData = cleanedData.slice(1, -1);
              // Unescape quotes
              cleanedData = cleanedData.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            }
            
            parsed = JSON.parse(cleanedData);
            console.log('✅ Successfully parsed double-encoded JSON');
          } catch (secondError) {
            console.error('❌ JSON parsing failed:', {
              originalError: firstError.message,
              secondError: secondError.message,
              data: data,
              contentType: contentType,
              url: req.url,
              method: req.method
            });
            
            return res.status(400).json({
              success: false,
              error: 'Invalid JSON format in request body',
              code: 'INVALID_JSON',
              details: process.env.NODE_ENV === 'development' ? {
                originalError: firstError.message,
                data: data.substring(0, 200) + (data.length > 200 ? '...' : '')
              } : undefined
            });
          }
        }

        req.body = parsed;
        console.log('✅ JSON parsed successfully:', {
          url: req.url,
          method: req.method,
          bodyKeys: Object.keys(parsed),
          bodyType: typeof parsed
        });
        
        next();
      } catch (error) {
        console.error('❌ Unexpected JSON parsing error:', {
          error: error.message,
          data: data,
          contentType: contentType,
          url: req.url,
          method: req.method
        });
        
        res.status(400).json({
          success: false,
          error: 'Invalid JSON format in request body',
          code: 'INVALID_JSON'
        });
      }
    });

    req.on('error', (error) => {
      console.error('❌ Request stream error:', error);
      res.status(400).json({
        success: false,
        error: 'Request stream error',
        code: 'REQUEST_ERROR'
      });
    });
  };
};

module.exports = customJsonParser;

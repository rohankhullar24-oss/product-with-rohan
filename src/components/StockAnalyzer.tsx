'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, ChevronDown } from 'lucide-react';

const StockAnalyzer = () => {
  const [selectedStock, setSelectedStock] = useState('RELIANCE');
  const [customMetrics, setCustomMetrics] = useState(null);
  const [expandedStock, setExpandedStock] = useState(null);

  // Sample database of Indian stocks with metrics
  const stocksData = {
    RELIANCE: {
      name: 'Reliance Industries',
      sector: 'Energy',
      price: 2850,
      pe: 24.5,
      pb: 2.1,
      roe: 9.2,
      debtToEquity: 0.35,
      revenueGrowth: 8.5,
      profitMargin: 6.8,
      freeCashFlow: 45000,
      currentRatio: 1.2,
      roa: 4.1,
    },
    TCS: {
      name: 'Tata Consultancy Services',
      sector: 'IT',
      price: 3850,
      pe: 28.2,
      pb: 8.5,
      roe: 32.5,
      debtToEquity: 0.05,
      revenueGrowth: 12.3,
      profitMargin: 20.1,
      freeCashFlow: 52000,
      currentRatio: 1.8,
      roa: 24.3,
    },
    INFY: {
      name: 'Infosys',
      sector: 'IT',
      price: 1650,
      pe: 26.4,
      pb: 6.2,
      roe: 24.8,
      debtToEquity: 0.04,
      revenueGrowth: 11.8,
      profitMargin: 19.5,
      freeCashFlow: 48000,
      currentRatio: 1.5,
      roa: 22.1,
    },
    HDFC: {
      name: 'HDFC Bank',
      sector: 'Banking',
      price: 1580,
      pe: 22.3,
      pb: 2.8,
      roe: 14.5,
      debtToEquity: 3.2,
      revenueGrowth: 15.2,
      profitMargin: 14.8,
      freeCashFlow: 35000,
      currentRatio: 0.8,
      roa: 1.8,
    },
    ITC: {
      name: 'ITC Limited',
      sector: 'FMCG',
      price: 460,
      pe: 18.5,
      pb: 0.95,
      roe: 5.8,
      debtToEquity: 0.2,
      revenueGrowth: 6.3,
      profitMargin: 12.5,
      freeCashFlow: 12000,
      currentRatio: 2.1,
      roa: 3.2,
    },
    WIPRO: {
      name: 'Wipro',
      sector: 'IT',
      price: 438,
      pe: 20.1,
      pb: 4.2,
      roe: 21.8,
      debtToEquity: 0.02,
      revenueGrowth: 9.5,
      profitMargin: 18.2,
      freeCashFlow: 28000,
      currentRatio: 1.6,
      roa: 19.5,
    },
    BAJAJ: {
      name: 'Bajaj Auto',
      sector: 'Automotive',
      price: 8250,
      pe: 16.8,
      pb: 1.4,
      roe: 8.5,
      debtToEquity: 0.08,
      revenueGrowth: 7.2,
      profitMargin: 8.9,
      freeCashFlow: 18000,
      currentRatio: 1.9,
      roa: 5.1,
    },
    LT: {
      name: 'Larsen & Toubro',
      sector: 'Infrastructure',
      price: 3450,
      pe: 25.6,
      pb: 3.2,
      roe: 12.8,
      debtToEquity: 0.45,
      revenueGrowth: 13.5,
      profitMargin: 11.2,
      freeCashFlow: 32000,
      currentRatio: 1.3,
      roa: 4.8,
    },
  };

  const calculateScore = (metrics: any) => {
    let score = 0;
    let details: any = {};

    const peScore = (() => {
      if (metrics.pe < 15) return 20;
      if (metrics.pe < 25) return 16;
      if (metrics.pe < 35) return 10;
      return 5;
    })();
    details.peScore = peScore;
    score += peScore;

    const roeScore = (() => {
      if (metrics.roe >= 20) return 20;
      if (metrics.roe >= 15) return 15;
      if (metrics.roe >= 10) return 10;
      return 5;
    })();
    details.roeScore = roeScore;
    score += roeScore;

    const debtScore = (() => {
      if (metrics.debtToEquity < 0.5) return 15;
      if (metrics.debtToEquity < 1) return 12;
      if (metrics.debtToEquity < 2) return 8;
      return 3;
    })();
    details.debtScore = debtScore;
    score += debtScore;

    const growthScore = (() => {
      if (metrics.revenueGrowth >= 15) return 15;
      if (metrics.revenueGrowth >= 10) return 12;
      if (metrics.revenueGrowth >= 5) return 9;
      return 5;
    })();
    details.growthScore = growthScore;
    score += growthScore;

    const marginScore = (() => {
      if (metrics.profitMargin >= 18) return 15;
      if (metrics.profitMargin >= 12) return 11;
      if (metrics.profitMargin >= 8) return 7;
      return 3;
    })();
    details.marginScore = marginScore;
    score += marginScore;

    const liquidityScore = (() => {
      if (metrics.currentRatio >= 1.5) return 10;
      if (metrics.currentRatio >= 1.0) return 7;
      if (metrics.currentRatio >= 0.8) return 4;
      return 1;
    })();
    details.liquidityScore = liquidityScore;
    score += liquidityScore;

    const roaScore = (() => {
      if (metrics.roa >= 15) return 5;
      if (metrics.roa >= 10) return 4;
      return 2;
    })();
    details.roaScore = roaScore;
    score += roaScore;

    return { totalScore: score, details };
  };

  const getInvestmentRating = (score: number) => {
    if (score >= 85) return { rating: 'Strong Buy', color: '#10b981', icon: '★★★★★' };
    if (score >= 75) return { rating: 'Buy', color: '#3b82f6', icon: '★★★★☆' };
    if (score >= 65) return { rating: 'Hold', color: '#f59e0b', icon: '★★★☆☆' };
    if (score >= 55) return { rating: 'Weak Hold', color: '#ef4444', icon: '★★☆☆☆' };
    return { rating: 'Avoid', color: '#dc2626', icon: '★☆☆☆☆' };
  };

  const selectedData = stocksData[selectedStock as keyof typeof stocksData];
  const { totalScore, details } = calculateScore(selectedData);
  const rating = getInvestmentRating(totalScore);

  const sortedStocks = Object.entries(stocksData)
    .map(([key, value]) => ({
      key,
      ...value,
      score: calculateScore(value).totalScore,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Indian Stock Analyzer</h1>
          <p className="text-slate-300 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Educational tool only. Not financial advice. Do your own research before investing.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Select Stock
                </label>
                <select
                  value={selectedStock}
                  onChange={(e) => setSelectedStock(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                >
                  {Object.entries(stocksData).map(([key, data]) => (
                    <option key={key} value={key}>
                      {key} - {data.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-8 pb-6 border-b border-slate-700">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedData.name}</h2>
                    <p className="text-slate-400">{selectedData.sector}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-white">₹{selectedData.price}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className="px-6 py-3 rounded-lg"
                    style={{ backgroundColor: rating.color + '20', borderLeft: `4px solid ${rating.color}` }}
                  >
                    <p className="text-sm text-slate-300">Investment Rating</p>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: rating.color }}
                    >
                      {rating.rating}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{rating.icon}</p>
                  </div>
                  <div
                    className="px-6 py-3 rounded-lg"
                    style={{ backgroundColor: '#3b82f6' + '20', borderLeft: `4px solid #3b82f6` }}
                  >
                    <p className="text-sm text-slate-300">Overall Score</p>
                    <p className="text-2xl font-bold text-blue-400">{totalScore}/100</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Financial Metrics</h3>

                {[
                  { label: 'P/E Ratio', value: selectedData.pe.toFixed(2), score: details.peScore, max: 20, desc: 'Lower is better' },
                  { label: 'ROE', value: selectedData.roe.toFixed(2) + '%', score: details.roeScore, max: 20, desc: 'Higher is better' },
                  { label: 'Debt-to-Equity', value: selectedData.debtToEquity.toFixed(2), score: details.debtScore, max: 15, desc: 'Lower is better' },
                  { label: 'Revenue Growth', value: selectedData.revenueGrowth.toFixed(2) + '%', score: details.growthScore, max: 15, desc: 'Higher is better' },
                  { label: 'Profit Margin', value: selectedData.profitMargin.toFixed(2) + '%', score: details.marginScore, max: 15, desc: 'Higher is better' },
                  { label: 'Current Ratio', value: selectedData.currentRatio.toFixed(2), score: details.liquidityScore, max: 10, desc: 'Liquidity indicator' },
                ].map((metric, idx) => (
                  <div key={idx} className="bg-slate-700/50 p-4 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-white">{metric.label}</p>
                        <p className="text-xs text-slate-400">{metric.desc}</p>
                      </div>
                      <p className="text-lg font-bold text-white">{metric.value}</p>
                    </div>
                    <div className="w-full bg-slate-600 rounded h-2">
                      <div
                        className="bg-blue-500 h-2 rounded"
                        style={{ width: `${(metric.score / metric.max) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{metric.score}/{metric.max} points</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Analysis & Insights</h3>
              <div className="space-y-3 text-slate-300">
                {totalScore >= 85 && (
                  <p>✓ Strong fundamentals with low debt and healthy profitability. Good for long-term wealth creation.</p>
                )}
                {totalScore >= 75 && totalScore < 85 && (
                  <p>✓ Solid financial metrics. Company shows reasonable growth with manageable risks.</p>
                )}
                {totalScore >= 65 && totalScore < 75 && (
                  <p>◆ Mixed signals. Some metrics are attractive, others need monitoring. Consider holding or averaging.</p>
                )}
                {totalScore < 65 && (
                  <p>⚠ Caution advised. Several metrics need improvement. Do thorough research before investing.</p>
                )}

                <p className="text-sm pt-2 border-t border-slate-700">
                  <strong>Note:</strong> This analysis is based on fundamental metrics only. Consider sector trends,
                  management quality, competitive positioning, and macroeconomic factors in your investment decision.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-white mb-4">Top Picks (By Score)</h3>
              <div className="space-y-2">
                {sortedStocks.map((stock, idx) => {
                  const stockRating = getInvestmentRating(stock.score);
                  return (
                    <button
                      key={stock.key}
                      onClick={() => setSelectedStock(stock.key)}
                      className={`w-full p-3 rounded border transition ${
                        selectedStock === stock.key
                          ? 'bg-blue-600 border-blue-500'
                          : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="text-left">
                          <p className="font-semibold text-white text-sm">{idx + 1}. {stock.key}</p>
                          <p className="text-xs text-slate-400">{(stock as any).name.split(' ')[0]}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-yellow-400">{stock.score}</p>
                          <p className="text-xs" style={{ color: stockRating.color }}>
                            {stockRating.rating}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-700">
                <h4 className="text-sm font-semibold text-white mb-3">Scoring Factors</h4>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li>• P/E Ratio: 20 pts</li>
                  <li>• ROE: 20 pts</li>
                  <li>• Debt-to-Equity: 15 pts</li>
                  <li>• Revenue Growth: 15 pts</li>
                  <li>• Profit Margin: 15 pts</li>
                  <li>• Liquidity: 10 pts</li>
                  <li>• ROA: 5 pts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-200 text-sm">
            <strong>⚠️ Important Disclaimer:</strong> This tool uses simplified metrics and historical data.
            Stock market returns are unpredictable. Always consult with a SEBI-registered financial advisor
            before making investment decisions. Past performance doesn't guarantee future results.
            Diversify your portfolio and invest according to your risk profile and time horizon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StockAnalyzer;

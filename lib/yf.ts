import YahooFinance from 'yahoo-finance2';

// Singleton instance — suppress survey/deprecation notices to keep logs clean
const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey', 'ripHistorical'],
});

export default yahooFinance;

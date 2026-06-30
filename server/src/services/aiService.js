import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY;
let groq = null;

if (apiKey && !apiKey.startsWith('your_')) {
  groq = new Groq({ apiKey });
}

export const getSmartMatchRanking = async (
  driver,
  passenger,
  driverRoute,
  passengerRoute,
  geometricOverlap
) => {
  try {
    const defaultExplanation = `${passenger.name} is looking to commute from ${passengerRoute.fromAddress.split(',')[0]} to ${passengerRoute.toAddress.split(',')[0]} around ${passengerRoute.departureTime}. ${driver.name} is driving along a highly overlapping route at ${driverRoute.departureTime}.`;
    
    if (!groq) {
      console.warn('Groq API Key not initialized. Returning heuristic score.');
      // Simple Heuristic calculations
      const timeDiff = Math.abs(
        parseInt(driverRoute.departureTime.split(':')[0]) * 60 +
          parseInt(driverRoute.departureTime.split(':')[1]) -
          (parseInt(passengerRoute.departureTime.split(':')[0]) * 60 +
            parseInt(passengerRoute.departureTime.split(':')[1]))
      );
      
      let scoreReduction = timeDiff > 60 ? 30 : timeDiff * 0.5; // lose points for time differences
      let finalScore = Math.max(0, Math.round(geometricOverlap.overlapScore - scoreReduction));

      // Extra trust and company match boosts
      if (driver.companyName && passenger.companyName && driver.companyName.toLowerCase() === passenger.companyName.toLowerCase()) {
        finalScore = Math.min(100, finalScore + 10);
      }

      return {
        overlapScore: finalScore,
        etaMinutes: Math.round(15 + (geometricOverlap.detourDistance / 1000) * 3), // simple ETA estimate
        aiExplanation: defaultExplanation + ` Shared route geometric overlap is ${geometricOverlap.overlapScore}%.`,
      };
    }

    const prompt = `
DailyPool is a daily carpooling matching app. Your job is to analyze two commuters' routes and profile details and calculate a refined compatibility score (0 to 100), estimated detour ETA delay in minutes, and write a friendly explanation of the match.

DRIVER PROFILE:
- Name: ${driver.name}
- Gender: ${driver.gender}
- Trust Score: ${driver.trustScore}/100
- Company Name: ${driver.companyName || 'Not Verified'}
- Route: ${driverRoute.fromAddress} -> ${driverRoute.toAddress}
- Departure: ${driverRoute.departureTime}
- Mode: ${driverRoute.mode} (Car owner offering seats)

PASSENGER PROFILE:
- Name: ${passenger.name}
- Gender: ${passenger.gender}
- Trust Score: ${passenger.trustScore}/100
- Company Name: ${passenger.companyName || 'Not Verified'}
- Route: ${passengerRoute.fromAddress} -> ${passengerRoute.toAddress}
- Departure: ${passengerRoute.departureTime}
- Mode: ${passengerRoute.mode}

GEOMETRIC ROUTE COMPARISON (from Maps):
- Direct overlap score: ${geometricOverlap.overlapScore}/100 (Based on spatial distance)
- Detour distance: ${geometricOverlap.detourDistance} meters

GENDER FILTER RULES:
- If either user has a strict gender preference (handled before this API, but keep in mind that same gender matches are highly trusted in India).

SCORING INSTRUCTIONS:
- Base score starts on Geometric Route overlap.
- Penalize heavily if departure times differ by more than 30 minutes (e.g. -1.5 points per minute of difference).
- Boost score by +10 if they work at the same company (great for trust!).
- Adjust score based on trust scores.
- Return output in JSON format with keys: "overlapScore" (number 0-100), "etaMinutes" (number, total trip ETA for passenger in minutes including detour), and "aiExplanation" (string, max 2-3 sentences explaining why it's a good match, pointing out shared company or overlap).

Return ONLY raw JSON, with no markdown code blocks, backticks, or extra commentary.
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const responseText = chatCompletion.choices[0].message.content.trim();
    const result = JSON.parse(responseText);

    return {
      overlapScore: typeof result.overlapScore === 'number' ? result.overlapScore : geometricOverlap.overlapScore,
      etaMinutes: typeof result.etaMinutes === 'number' ? result.etaMinutes : 20,
      aiExplanation: result.aiExplanation || defaultExplanation,
    };
  } catch (error) {
    console.error('Error in Groq smart match ranking:', error);
    return {
      overlapScore: geometricOverlap.overlapScore,
      etaMinutes: 25,
      aiExplanation: `Heuristic route match of ${geometricOverlap.overlapScore}% between ${passenger.name} and ${driver.name}.`,
    };
  }
};

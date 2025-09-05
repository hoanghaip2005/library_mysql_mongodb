// Smart Library - MongoDB Analytics Aggregation Pipelines

// 1. Average session time per user
const averageSessionTimePerUser = [
  {
    $match: {
      session_end: { $exists: true } // Only completed sessions
    }
  },
  {
    $project: {
      user_id: 1,
      session_duration: {
        $divide: [
          { $subtract: ["$session_end", "$session_start"] },
          1000 * 60 // Convert to minutes
        ]
      }
    }
  },
  {
    $group: {
      _id: "$user_id",
      averageSessionTime: { $avg: "$session_duration" },
      totalSessions: { $sum: 1 }
    }
  },
  {
    $sort: { averageSessionTime: -1 }
  }
];

// 2. Most highlighted books
const mostHighlightedBooks = [
  {
    $match: {
      "highlights": { $exists: true, $ne: [] }
    }
  },
  {
    $project: {
      book_id: 1,
      highlightCount: { $size: "$highlights" }
    }
  },
  {
    $group: {
      _id: "$book_id",
      totalHighlights: { $sum: "$highlightCount" },
      readingSessions: { $sum: 1 }
    }
  },
  {
    $sort: { totalHighlights: -1 }
  },
  {
    $limit: 10
  }
];

// 3. Top 10 books by total reading time
const topBooksByReadingTime = [
  {
    $match: {
      session_end: { $exists: true }
    }
  },
  {
    $project: {
      book_id: 1,
      reading_duration: {
        $divide: [
          { $subtract: ["$session_end", "$session_start"] },
          1000 * 60 // Convert to minutes
        ]
      }
    }
  },
  {
    $group: {
      _id: "$book_id",
      totalReadingTime: { $sum: "$reading_duration" },
      averageSessionTime: { $avg: "$reading_duration" },
      totalSessions: { $sum: 1 }
    }
  },
  {
    $sort: { totalReadingTime: -1 }
  },
  {
    $limit: 10
  }
];

// 4. Reading progress analysis
const readingProgressAnalysis = [
  {
    $match: {
      reading_progress: { $exists: true }
    }
  },
  {
    $group: {
      _id: "$book_id",
      averageProgress: { $avg: "$reading_progress" },
      completionRate: {
        $avg: {
          $cond: [
            { $gte: ["$reading_progress", 0.95] },
            1,
            0
          ]
        }
      },
      totalReaders: { $sum: 1 }
    }
  },
  {
    $sort: { averageProgress: -1 }
  }
];

// Export aggregation pipelines
module.exports = {
  averageSessionTimePerUser,
  mostHighlightedBooks,
  topBooksByReadingTime,
  readingProgressAnalysis
};

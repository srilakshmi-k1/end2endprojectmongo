function calculateRiskLevel(cgpa, attendance) {
  cgpa       = parseFloat(cgpa);
  attendance = parseFloat(attendance);
  if (cgpa < 5 && attendance < 60)                                   return 'High Risk';
  if ((cgpa >= 5 && cgpa <= 7) || (attendance >= 60 && attendance <= 75)) return 'Moderate Risk';
  if (cgpa > 7 && attendance > 75)                                   return 'Safe';
  return 'Moderate Risk';
}

function generateAISuggestions(student) {
  const { name, cgpa, attendance, level_name } = student;
  const suggestions = [];

  if (cgpa < 5) {
    suggestions.push(`📚 ${name} has a CGPA of ${cgpa}. Recommend enrolling in peer tutoring and weekly faculty consultations.`);
    suggestions.push(`🗓️ Suggest creating a structured daily study plan (minimum 4 hours/day) focusing on weakest subjects.`);
    suggestions.push(`📝 Advise the student to attempt past-year question papers and seek academic mentoring.`);
  } else if (cgpa <= 7) {
    suggestions.push(`📖 CGPA of ${cgpa} is moderate. Encourage additional practice and group study.`);
    suggestions.push(`🎯 Set a target CGPA improvement of 0.5 per semester with bi-weekly counsellor check-ins.`);
  } else {
    suggestions.push(`⭐ Excellent CGPA of ${cgpa}! Encourage participation in research projects or internships.`);
  }

  if (attendance < 60) {
    suggestions.push(`⚠️ Critical attendance of ${attendance}%. Immediate intervention — schedule a family meeting.`);
    suggestions.push(`📞 Contact student and guardians to understand barriers to attendance.`);
  } else if (attendance <= 75) {
    suggestions.push(`📅 Attendance is ${attendance}%. Counsel student on importance of regular attendance.`);
    suggestions.push(`✅ Set up a weekly attendance tracking system with reminders.`);
  } else {
    suggestions.push(`✅ Great attendance of ${attendance}%! Maintain consistency.`);
  }

  if (level_name === 'High Risk') {
    suggestions.push(`🚨 HIGH RISK student — prioritize for immediate counselling session this week.`);
    suggestions.push(`📋 Create a personalised improvement plan with monthly milestones.`);
  }

  return suggestions;
}

module.exports = { calculateRiskLevel, generateAISuggestions };

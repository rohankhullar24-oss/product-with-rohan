import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { TailoredResume } from "./tailor";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  header: {
    marginBottom: 16,
    textAlign: "center",
  },
  name: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  contact: {
    fontSize: 9,
    color: "#475569",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 2,
  },
  summary: {
    lineHeight: 1.4,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  skillItem: {
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 4,
    marginBottom: 4,
    fontSize: 9,
  },
  expItem: {
    marginBottom: 10,
  },
  expHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  role: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
  },
  company: {
    fontSize: 10,
    color: "#334155",
  },
  dates: {
    fontSize: 9,
    color: "#64748b",
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 8,
  },
  bulletDot: {
    width: 10,
  },
  bulletText: {
    flex: 1,
    lineHeight: 1.35,
  },
  eduItem: {
    marginBottom: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export function ResumePdf({ resume }: { resume: TailoredResume }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{resume.name}</Text>
          <Text style={styles.contact}>
            {[resume.phone, resume.email, resume.location].filter(Boolean).join("  |  ")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.summary}>{resume.summary}</Text>
        </View>

        {resume.skills?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsRow}>
              {resume.skills.map((skill, i) => (
                <Text key={i} style={styles.skillItem}>
                  {skill}
                </Text>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          {resume.experience.map((exp, i) => (
            <View key={i} style={styles.expItem} wrap={false}>
              <View style={styles.expHeaderRow}>
                <Text style={styles.role}>
                  {exp.role} — {exp.company}
                </Text>
                <Text style={styles.dates}>{exp.dates}</Text>
              </View>
              {exp.bullets.map((bullet, j) => (
                <View key={j} style={styles.bullet}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {resume.education?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {resume.education.map((edu, i) => (
              <View key={i} style={styles.eduItem}>
                <Text>
                  {edu.degree}, {edu.school}
                </Text>
                <Text style={styles.dates}>{edu.dates}</Text>
              </View>
            ))}
          </View>
        )}

        {resume.certifications && resume.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {resume.certifications.map((cert, i) => (
              <Text key={i} style={{ marginBottom: 2 }}>
                • {cert}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

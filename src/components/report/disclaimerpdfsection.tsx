import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { getDisclaimerBlock } from "@/lib/disclaimers";

// ASSUMPTION: the PDF is built with @react-pdf/renderer. If the team picked another library,
// keep getDisclaimerBlock() and only swap the rendering primitives below.

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderColor: "#b45309", backgroundColor: "#fffbeb", padding: 10, marginBottom: 12 },
  title: { fontSize: 11, fontWeight: "bold", marginBottom: 4 },
  stamp: { fontSize: 9, fontWeight: "bold", marginBottom: 4 },
  body: { fontSize: 9, lineHeight: 1.4, marginBottom: 3 },
});

/**
 * Rendered prominently (boxed, not small print) on the first page of the PDF report.
 * Use `fixed` in a page footer as well if the team wants it repeated on every page.
 * `generatedAt` is EngineResult.generatedAt (AC1, AC4, AC5).
 */
export function DisclaimerPdfSection({ generatedAt }: { generatedAt: string }) {
  const { title, generatedAtLine, paragraphs } = getDisclaimerBlock(generatedAt);

  return (
    <View style={styles.box} wrap={false}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.stamp}>{generatedAtLine}</Text>
      {paragraphs.map((text) => (
        <Text key={text} style={styles.body}>
          {text}
        </Text>
      ))}
    </View>
  );
}
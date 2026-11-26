import {
  Document,
  Page,
  Text,
  View,
  Link,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

import interRegular from "@fontsource/inter/files/inter-latin-400-normal.woff?url";
import interBold from "@fontsource/inter/files/inter-latin-700-normal.woff?url";
import interRegularExtended from "@fontsource/inter/files/inter-latin-ext-400-normal.woff?url";
import interBoldExtended from "@fontsource/inter/files/inter-latin-ext-700-normal.woff?url";

Font.register({
  family: "Inter",
  fonts: [
    { src: interRegular, fontWeight: 400 },
    { src: interBold, fontWeight: 700 },
  ],
});
Font.register({
  family: "Inter Latin Ext",
  fonts: [
    { src: interRegularExtended, fontWeight: 400 },
    { src: interBoldExtended, fontWeight: 700 },
  ],
});
import type { ReportViewModel, ReportBomLine } from "./report-view-model";
import { formatCategory, formatMaterialName } from "./format-labels";

const interFontFamilies = ["Inter", "Inter Latin Ext"];

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: interFontFamilies,
    fontWeight: 400,
    color: "#1F2937",
  },
  title: {
    fontSize: 23,
    fontFamily: interFontFamilies,
    fontWeight: 700,
    color: "#8200DA",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 10,
    marginBottom: 5,
    color: "#374151",
  },
  section: {
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: interFontFamilies,
    fontWeight: 700,
    marginBottom: 8,
    color: "#111827",
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  disclaimer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#F9B84A",
    backgroundColor: "#FFF5E6",
    marginTop: 12,
    marginBottom: 12,
  },
  disclaimerTitle: {
    fontSize: 11,
    fontFamily: interFontFamilies,
    fontWeight: 700,
    color: "#9A3412",
    marginBottom: 7,
  },
  disclaimerText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: "#374151",
    marginBottom: 5,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 6,
  },
  label: {
    width: "40%",
    fontWeight: "bold",
    paddingRight: 8,
  },
  value: {
    width: "60%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    paddingVertical: 8,
    paddingHorizontal: 5,
    fontFamily: interFontFamilies,
    fontWeight: 700,
    color: "#374151",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  tableCell: {
    paddingRight: 5,
    fontSize: 8,
  },
  note: {
    fontSize: 9,
    color: "#6B7280",
    marginBottom: 5,
  },
  link: {
    color: "#374151",
    textDecoration: "underline",
  },
  requirementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  requirementItem: {
    width: "50%",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  requirementLabel: {
    fontSize: 7.5,
    color: "#6B7280",
    marginBottom: 2,
  },
  requirementValue: {
    fontSize: 9,
    fontWeight: "bold",
  },
  topologyImage: {
    width: "100%",
    objectFit: "contain",
    marginTop: 8,
  },
});

function money(value: number | null, currency: string): string {
  if (value === null || !Number.isFinite(value)) {
    return "Price on request";
  }
  return `${currency} ${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          {
            borderLeftWidth: 4,
            borderLeftColor: "#8200DA",
            paddingLeft: 10,
          },
        ]}
        minPresenceAhead={85}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function BomRow({
  line,
  currency,
}: {
  line: ReportBomLine;
  currency: string;
}) {
  const source =
    line.priceSource === "synchronized"
      ? "Synced"
      : line.priceSource === "manual"
        ? "Manual"
        : "Not specified";

  const validPriceReferences = (line.priceReferences ?? []).filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  });

  return (
    <View style={styles.tableRow} wrap={false}>
      <View style={{ width: "22%" }}>
        <Text style={styles.tableCell}>{formatCategory(line.category)}</Text>
        <Text style={styles.tableCell}>{line.sku}</Text>
      </View>
      <View style={{ width: "28%" }}>
        <Text style={styles.tableCell}>{line.name}</Text>
        <Text style={styles.tableCell}>{line.vendor}</Text>
      </View>
      <Text style={[styles.tableCell, { width: "8%" }]}>
        {line.qty}
      </Text>
      <View style={{ width: "22%", alignItems: "flex-end" }}>
        <Text style={[styles.tableCell, { textAlign: "right" }]}>
          {money(line.unitPrice, currency)}
        </Text>
        <Text style={styles.tableCell}>{source}</Text>
        {line.isStale && (
          <Text style={styles.tableCell}>Stale</Text>
        )}
        {line.priceUpdatedAt && (
          <Text style={styles.tableCell}>
            Last verified {new Date(line.priceUpdatedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })}
          </Text>
        )}
        {validPriceReferences.map((url, index) => (
          <Link key={`${url}-${index}`} src={url} style={styles.link}>
            {`Price reference ${index + 1}`}
          </Link>
        ))}
      </View>
      <Text style={[styles.tableCell, { width: "20%", textAlign: "right" }]}>
        {money(line.lineTotal, currency)}
      </Text>
    </View>
  );
}

function InstallationSummary({
  materials,
}: {
  materials: Record<string, unknown> | null;
}) {
  if (!materials) {
    return <Text>No installation materials summary was provided.</Text>;
  }

  const items = Array.isArray(materials.items)
    ? materials.items.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object" && !Array.isArray(item),
      )
    : [];

  return (
    <View>
      <View style={{ marginTop: 8 }}>
        <View style={styles.tableHeader} minPresenceAhead={45}>
          <Text style={[styles.tableCell, { width: "20%" }]}>Material</Text>
          <Text style={[styles.tableCell, { width: "50%" }]}>Description</Text>
          <Text style={[styles.tableCell, { width: "10%" }]}>Unit</Text>
          <Text style={[styles.tableCell, { width: "20%" }]}>Representative price</Text>
        </View>

        {items.map((item, index) => (
          <View key={index} style={styles.tableRow} wrap={false}>
            <Text style={[styles.tableCell, { width: "20%" }]}>
              {formatMaterialName(String(item.item ?? "Material"))}
            </Text>
            <Text style={[styles.tableCell, { width: "50%" }]}>
              {String(item.description ?? "—")}
            </Text>
            <Text style={[styles.tableCell, { width: "10%" }]}>
              {String(item.unit ?? "—")}
            </Text>
            <Text style={[styles.tableCell, { width: "20%" }]}>
              {String(item.priceDisplay ?? item.representativeUnitPrice ?? "Price on request")}
            </Text>
          </View>
        ))}
      </View>

      {items.length === 0 && (
        <Text style={styles.note}>No individual material items provided.</Text>
      )}
    </View>
  );
}

export function ReportPdfDocument({
  report,
  topologySnapshot,
}: {
  report: ReportViewModel;
  topologySnapshot?: string | null;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>Network Planning Report</Text>
        <Text style={styles.subtitle}>
          Project: {report.project.companyName}
        </Text>
        <Text style={styles.subtitle}>
          Vendor: {report.selectedVendor}
        </Text>
        <Text style={styles.subtitle}>
          Plan type: {report.selectedPlanType === "CE" ? "Cost-Efficient" : "High-Performance"}
        </Text>
        <Text style={styles.subtitle}>
          {report.disclaimers.generatedAtLine}
        </Text>

        <View style={styles.disclaimer} wrap={false}>
          <Text style={styles.disclaimerTitle}>
            Planning &amp; Pricing Disclaimer
          </Text>
          {report.disclaimers.paragraphs.map((paragraph, index) => (
            <Text key={index} style={styles.disclaimerText}>
              {paragraph}
            </Text>
          ))}
        </View>

        <Section title="Network Requirements">
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[0, 1, 2].map((columnIndex) => {
              const columnSize = Math.ceil(report.requirements.length / 3);
              const columnRequirements = report.requirements.slice(
                columnIndex * columnSize,
                (columnIndex + 1) * columnSize,
              );

              return (
                <View key={columnIndex} style={{ width: "32%" }}>
                  {columnRequirements.map((requirement, index) => (
                    <View
                      key={`${requirement.label}-${index}`}
                      style={{
                        flexDirection: "row",
                        borderBottomWidth: 0.5,
                        borderBottomColor: "#E5E7EB",
                        paddingVertical: 3,
                        minHeight: 21,
                      }}
                      wrap={false}
                    >
                      <Text
                        style={{
                          width: "53%",
                          fontSize: 7,
                          color: "#6B7280",
                          paddingRight: 4,
                        }}
                      >
                        {requirement.label}
                      </Text>
                      <Text
                        style={{
                          width: "47%",
                          fontSize: 7.5,
                          fontWeight: "bold",
                          color: "#1F2937",
                        }}
                      >
                        {requirement.value}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </Section>

        <Section title="Recommended Hardware">
          {report.hardware.length === 0 ? (
            <Text>No recommended hardware provided.</Text>
          ) : (
            <View>
              <View style={styles.tableHeader} minPresenceAhead={45}>
                <Text style={[styles.tableCell, { width: "30%" }]}>
                  Device / Model
                </Text>
                <Text style={[styles.tableCell, { width: "17%" }]}>
                  Category
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  SKU
                </Text>
                <Text style={[styles.tableCell, { width: "23%" }]}>
                  Vendor
                </Text>
                <Text style={[styles.tableCell, { width: "10%" }]}>
                  Qty
                </Text>
              </View>
              {report.hardware.map((line, index) => (
                <View key={index} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.tableCell, { width: "30%" }]}>
                    {line.name}
                  </Text>
                  <Text style={[styles.tableCell, { width: "17%" }]}>
                    {formatCategory(line.category)}
                  </Text>
                  <Text style={[styles.tableCell, { width: "20%" }]}>
                    {line.sku}
                  </Text>
                  <Text style={[styles.tableCell, { width: "23%" }]}>
                    {line.vendor}
                  </Text>
                  <Text style={[styles.tableCell, { width: "10%" }]}>
                    {line.qty}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="Network Topology">
          {topologySnapshot ? (
            <Image src={topologySnapshot} style={styles.topologyImage} />
          ) : (
            <Text>Diagram unavailable</Text>
          )}
        </Section>
      </Page>

      <Page
        size="A4"
        style={styles.page}
        layout={({ children }) => (
          <View style={{ flex: 1 }}>
            <View style={{ marginBottom: 8 }}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    borderLeftWidth: 4,
                    borderLeftColor: "#8200DA",
                    paddingLeft: 10,
                  },
                ]}
              >
                Network Equipment BOM
              </Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: "22%" }]}>
                  Category / SKU
                </Text>
                <Text style={[styles.tableCell, { width: "28%" }]}>
                  Device / Vendor
                </Text>
                <Text style={[styles.tableCell, { width: "8%" }]}>
                  Qty
                </Text>
                <Text style={[styles.tableCell, { width: "22%", textAlign: "right" }]}>
                  Unit price
                </Text>
                <Text style={[styles.tableCell, { width: "20%", textAlign: "right" }]}>
                  Line total
                </Text>
              </View>
            </View>
            <View style={{ flexGrow: 1 }}>{children}</View>
          </View>
        )}
      >
        {report.bom.lines.map((line, index) => (
          <BomRow
            key={index}
            line={line}
            currency={report.bom.currency}
          />
        ))}
        <View
          style={{
            flexDirection: "row",
            borderTopWidth: 1,
            borderTopColor: "#9CA3AF",
            borderBottomWidth: 0.5,
            borderBottomColor: "#E5E7EB",
            backgroundColor: "#F9FAFB",
            paddingVertical: 9,
            paddingHorizontal: 5,
          }}
          wrap={false}
        >
          <Text
            style={{
              width: "80%",
              fontWeight: "bold",
              fontSize: 8,
            }}
          >
            Equipment subtotal (known prices)
          </Text>
          <Text
            style={{
              width: "20%",
              textAlign: "right",
              fontWeight: "bold",
              fontSize: 8,
            }}
          >
            {money(report.bom.total, report.bom.currency)}
          </Text>
        </View>
        {report.bom.totalIsPartial && (
          <Text style={styles.note}>
            Some equipment prices are unavailable. The total includes priced items only.
          </Text>
        )}
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <Section title="Installation Materials Summary">
          <InstallationSummary materials={report.installationMaterials} />
        </Section>

        <Section title="Assumptions">
          {report.assumptions.length === 0 ? (
            <Text>No assumptions provided.</Text>
          ) : (
            <View>
              <View style={styles.tableHeader} minPresenceAhead={45}>
                <Text style={[styles.tableCell, { width: "28%" }]}>Field</Text>
                <Text style={[styles.tableCell, { width: "25%" }]}>Value</Text>
                <Text style={[styles.tableCell, { width: "47%" }]}>Reason</Text>
              </View>
              {report.assumptions.map((assumption, index) => (
                <View key={index} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.tableCell, { width: "28%" }]}>
                    {assumption.field}
                  </Text>
                  <Text style={[styles.tableCell, { width: "25%" }]}>
                    {assumption.value}
                  </Text>
                  <Text style={[styles.tableCell, { width: "47%" }]}>
                    {assumption.reason}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="Notes and Limitations">
          {report.flags.length === 0 && report.limitations.length === 0 ? (
            <Text>No additional notes or limitations provided.</Text>
          ) : (
            <View>
              <View style={styles.tableHeader} minPresenceAhead={45}>
                <Text style={[styles.tableCell, { width: "22%" }]}>Type</Text>
                <Text style={[styles.tableCell, { width: "78%" }]}>Description</Text>
              </View>
              {report.flags.map((flag, index) => (
                <View key={`flag-${index}`} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.tableCell, { width: "22%" }]}>Note</Text>
                  <Text style={[styles.tableCell, { width: "78%" }]}>{flag}</Text>
                </View>
              ))}
              {report.limitations.map((limitation, index) => (
                <View key={`limitation-${index}`} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.tableCell, { width: "22%" }]}>Limitation</Text>
                  <Text style={[styles.tableCell, { width: "78%" }]}>
                    {limitation}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Section>
      </Page>
    </Document>
  );
}

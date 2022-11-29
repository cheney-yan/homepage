import { useTranslation } from "next-i18next";

import Container from "components/services/widget/container";
import Block from "components/services/widget/block";
import useWidgetAPI from "utils/proxy/use-widget-api";

export default function Component({ service }) {
  const { t } = useTranslation();

  const { widget } = service;

  const { data: ipSonderData, error: ipSonderError } = useWidgetAPI(widget, "root");

  if (ipSonderError) {
    return <Container error={ipSonderError} />;
  }
  
  if (!ipSonderData) {
    return (
      <Container service={service}>
        <Block label="ipSonder.ip" />
      </Container>
    );
  }

  const filtered =
    ipSonderData.num_replaced_safebrowsing + ipSonderData.num_replaced_safesearch + ipSonderData.num_replaced_parental;

  return (
    <Container service={service}>
      <Block label="ipSonder.ip" value={t("common.string", { value: ipSonderData.ip })} />
      <Block
        label="ipSonder.latency"
        value={t("common.ms", { value: ipSonderData.avg_processing_time * 1000, style: "unit", unit: "millisecond" })}
      />
    </Container>
  );
}

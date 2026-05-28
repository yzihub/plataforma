# Suggested Metrics Dashboard

Build the Ju behavioral dashboard around operational questions, not raw API status.

## Executive Health

- Overall behavioral score by run
- Passing scenarios / total scenarios
- Critical violations by run
- Regression count by run
- Average latency by scenario
- Tool-required turns with successful property-presentation signal

## Conversational UX

- Naturalness score
- Excessive question count
- Permission-asking violations
- GPT-like structure violations
- Bullet/catalog dump violations
- Average response word count
- Cold lead pressure rate

## Consultative Intelligence

- Emotional alignment positives
- Tradeoff language positives
- Family/investor/luxury semantic alignment
- Memory continuity success for re-engagement
- High-intent directness score

## Operational Correctness

- `consultar_imoveis` required turns
- observed property URL count
- malformed URL count
- hallucinated URL count, if internal tool traces are persisted
- card presentation policy compliance
- availability questions answered without unsupported certainty

## Retrieval Quality

- retrieval policy by turn
- vector chunk count
- semantic alignment by scenario
- retrieval latency
- over-retrieval rate
- missing retrieval on semantic questions

## Governance

- runtime leak violations
- financial promise violations
- FGTS/financing compliance violations
- investment return promise violations
- luxury tone drift
- influencer language drift

## Drilldown

Each failed scenario should expose:

- persona
- emotional context
- source channel
- full input payload
- generated context
- tool calls
- retrieval chunks
- final response
- score explanation
- violations
- positives
- memory state before and after turn


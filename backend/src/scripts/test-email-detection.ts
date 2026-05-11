import { emailDetectionFixtureCases } from "../fixtures/email-detection-cases";
import { analyzeMessageForSubscription } from "../services/email-detection.service";

type AssertionFailure = {
    field: string;
    expected: unknown;
    actual: unknown;
};

function collectFailures(
    expected: (typeof emailDetectionFixtureCases)[number]["expected"],
    actual: ReturnType<typeof analyzeMessageForSubscription>
) {
    const failures: AssertionFailure[] = [];

    if (actual.isCandidate !== expected.isCandidate) {
        failures.push({
            field: "isCandidate",
            expected: expected.isCandidate,
            actual: actual.isCandidate,
        });
    }

    if (
        expected.provider !== undefined &&
        actual.detected.provider !== expected.provider
    ) {
        failures.push({
            field: "provider",
            expected: expected.provider,
            actual: actual.detected.provider,
        });
    }

    if (expected.name !== undefined && actual.detected.name !== expected.name) {
        failures.push({
            field: "name",
            expected: expected.name,
            actual: actual.detected.name,
        });
    }

    if (
        expected.isTrial !== undefined &&
        actual.detected.isTrial !== expected.isTrial
    ) {
        failures.push({
            field: "isTrial",
            expected: expected.isTrial,
            actual: actual.detected.isTrial,
        });
    }

    if (
        expected.billingCycle !== undefined &&
        actual.detected.billingCycle !== expected.billingCycle
    ) {
        failures.push({
            field: "billingCycle",
            expected: expected.billingCycle,
            actual: actual.detected.billingCycle,
        });
    }

    if (
        expected.amountText !== undefined &&
        actual.detected.amountText !== expected.amountText
    ) {
        failures.push({
            field: "amountText",
            expected: expected.amountText,
            actual: actual.detected.amountText,
        });
    }

    if (
        expected.minConfidence !== undefined &&
        actual.confidence < expected.minConfidence
    ) {
        failures.push({
            field: "minConfidence",
            expected: `>= ${expected.minConfidence}`,
            actual: actual.confidence,
        });
    }

    if (
        expected.maxConfidence !== undefined &&
        actual.confidence > expected.maxConfidence
    ) {
        failures.push({
            field: "maxConfidence",
            expected: `<= ${expected.maxConfidence}`,
            actual: actual.confidence,
        });
    }

    return failures;
}

let passed = 0;
let failed = 0;
const failedCaseNames: string[] = [];
const passedCaseNames: string[] = [];

for (const fixtureCase of emailDetectionFixtureCases) {
    const actual = analyzeMessageForSubscription(fixtureCase.input);
    const failures = collectFailures(fixtureCase.expected, actual);

    if (failures.length === 0) {
        passed += 1;
        passedCaseNames.push(fixtureCase.name);
        console.log(`PASS ${fixtureCase.name}`);
        continue;
    }

    failed += 1;
    failedCaseNames.push(fixtureCase.name);
    console.log(`FAIL ${fixtureCase.name}`);
    console.log("  expected:", JSON.stringify(fixtureCase.expected, null, 2));
    console.log(
        "  actual:",
        JSON.stringify(
            {
                isCandidate: actual.isCandidate,
                confidence: actual.confidence,
                detected: actual.detected,
                reasons: actual.reasons,
            },
            null,
            2
        )
    );
    console.log("  failures:", JSON.stringify(failures, null, 2));
}

console.log("");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (passedCaseNames.length > 0) {
    console.log(`Passed cases: ${passedCaseNames.join(", ")}`);
}

if (failedCaseNames.length > 0) {
    console.log(`Failed cases: ${failedCaseNames.join(", ")}`);
    process.exitCode = 1;
}

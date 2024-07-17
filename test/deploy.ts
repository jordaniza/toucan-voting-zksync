import deploy from "../deploy/deploy";

describe.only("Deploy", () => {
  it("works", async () => {
    await deploy();
  });
});

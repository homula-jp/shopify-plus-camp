import {
  Banner,
  useApi,
  reactExtension,
  BlockSpacer,
  useTranslate,
  useShippingAddress,
  useCartLines,
} from "@shopify/ui-extensions-react/checkout";

export default reactExtension("purchase.checkout.block.render", () => (
  <Extension />
));

function Extension() {
  const translate = useTranslate();
  const { extension, shop } = useApi();
  const address = useShippingAddress();
  const cartLines = useCartLines();

  return (
    <>
      <Banner title={shop.name}>
        {translate("version")}: {extension.apiVersion}
      </Banner>
      <BlockSpacer />
      <Banner title={address.name} status="warning">
        {translate("cart.length", {
          length: cartLines.reduce((prev, line) => prev + line.quantity, 0),
        })}
      </Banner>
    </>
  );
}

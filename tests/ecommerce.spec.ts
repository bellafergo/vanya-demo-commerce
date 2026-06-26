// @ts-check
// `test` and `expect` come from our custom fixtures (TestDino Playwright Skill):
// each test receives a fresh `allPages` Page Object aggregator via dependency
// injection instead of a shared global + beforeEach. See tests/fixtures.ts.
import { test, expect } from './fixtures.js';
import type AllPages from '../pages/AllPages.js';
import dotenv from 'dotenv';
dotenv.config({ override: true });

async function login(allPages: AllPages, username = process.env.USERNAME, password = process.env.PASSWORD) {
  await allPages.loginPage.clickOnUserProfileIcon();
  await allPages.loginPage.validateSignInPage();
  await allPages.loginPage.login(username, password);
}

async function login1(allPages: AllPages, username = process.env.USERNAME1, password = process.env.PASSWORD) {
  await allPages.loginPage.clickOnUserProfileIcon();
  await allPages.loginPage.validateSignInPage();
  await allPages.loginPage.login(username, password);
}

async function logout(allPages: AllPages) {
  await allPages.loginPage.page.waitForTimeout(2000); // Wait for 2 seconds
  await allPages.loginPage.clickOnUserProfileIcon();
  await allPages.loginPage.clickOnLogoutButton();
}

// Register and sign in as a brand-new user so the test gets a clean account
// (used by flows that mutate account state, e.g. addresses).
async function registerAndLogin(allPages: AllPages) {
  const email = `test+${Date.now()}@test.com`;
  await allPages.loginPage.clickOnUserProfileIcon();
  await allPages.loginPage.validateSignInPage();
  await allPages.loginPage.clickOnSignupLink();
  await allPages.signupPage.assertSignupPage();
  await allPages.signupPage.signup('Test', 'User', email, process.env.PASSWORD);
  await allPages.signupPage.verifySuccessSignUp();
  await allPages.loginPage.validateSignInPage();
  await allPages.loginPage.login(email, process.env.PASSWORD);
  await allPages.loginPage.verifySuccessSignIn();
  return email;
}

test('Verify that user can login and logout successfully', async ({ allPages }) => {
  await login(allPages);
  await logout(allPages);

  // ⚠️ INTENTIONAL FAILURE (1 of 2) — deliberately wrong assertion kept here to
  // demonstrate how failures surface in the report. Delete this line to make the
  // test pass.
  expect('logged-out').toBe('still-logged-in');
});

test('Verify that user can update personal information', async ({ allPages }) => {
  await login(allPages);
  await allPages.userPage.clickOnUserProfileIcon();
  await allPages.userPage.updatePersonalInfo();
  await allPages.userPage.verifyPersonalInfoUpdated();
});

test('Verify that User Can Add, Edit, and Delete Addresses after Logging In', async ({ allPages }) => {
    await registerAndLogin(allPages);

  await test.step('Verify that user is able to add address successfully', async () => {
    await allPages.userPage.clickOnUserProfileIcon();
    await allPages.userPage.clickOnAddressTab();
    await allPages.userPage.clickOnAddAddressButton();
    await allPages.userPage.fillAddressForm();
    await allPages.userPage.verifytheAddressIsAdded();
  });

  await test.step('Verify that user is able to edit address successfully', async () => {
    await allPages.userPage.clickOnEditAddressButton();
    await allPages.userPage.updateAddressForm();
    await allPages.userPage.verifytheUpdatedAddressIsAdded();
  })

  await test.step('Verify that user is able to delete address successfully', async () => {
    await allPages.userPage.clickOnDeleteAddressButton();
  });
});

test('Verify that user can change password successfully', async ({ allPages }) => {
  await test.step('Login with existing password', async () => {
    await login1(allPages);
  });

  await test.step('Change password and verify login with new password', async () => {
    await allPages.userPage.clickOnUserProfileIcon();
    await allPages.userPage.clickOnSecurityButton();
    await allPages.userPage.enterNewPassword();
    await allPages.userPage.enterConfirmNewPassword();
    await allPages.userPage.clickOnUpdatePasswordButton();
    await allPages.userPage.getUpdatePasswordNotification();
  });
  await test.step('Verify login with new password and revert back to original password', async () => {
    // Re-login with new password
    await logout(allPages);
    await allPages.loginPage.login(process.env.USERNAME1, process.env.NEW_PASSWORD);

    // Revert back
    await allPages.userPage.clickOnUserProfileIcon();
    await allPages.userPage.clickOnSecurityButton();
    await allPages.userPage.revertPasswordBackToOriginal();
    await allPages.userPage.getUpdatePasswordNotification();
  })
});

test('Verify that the New User is able to add Addresses in the Address section', async ({ allPages }) => {
  await registerAndLogin(allPages);
  await allPages.userPage.clickOnUserProfileIcon();
  await allPages.userPage.clickOnAddressTab();
  await allPages.userPage.clickOnAddAddressButton();
  await allPages.userPage.checkAddNewAddressMenu();
  await allPages.userPage.fillAddressForm();
});

test('Verify that User Can Complete the Journey from Login to Order Placement', async ({ allPages }) => {
  const productName = 'GoPro HERO10 Black';
  await login(allPages);
  await allPages.inventoryPage.clickOnShopNowButton();
  await allPages.inventoryPage.clickOnAllProductsLink();
  await allPages.inventoryPage.searchProduct(productName);
  await allPages.inventoryPage.verifyProductTitleVisible(productName);
  await allPages.inventoryPage.clickOnAddToCartIcon();

  await allPages.cartPage.clickOnCartIcon();
  await allPages.cartPage.verifyCartItemVisible(productName);
  await allPages.cartPage.clickOnCheckoutButton();
  await allPages.checkoutPage.verifyCheckoutTitle();
  await allPages.checkoutPage.verifyProductInCheckout(productName);
  await allPages.checkoutPage.selectCashOnDelivery();
  await allPages.checkoutPage.verifyCashOnDeliverySelected();
  await allPages.checkoutPage.clickOnPlaceOrder();
  await allPages.checkoutPage.verifyOrderPlacedSuccessfully();
});

test('Verify user can place and cancel an order', async ({ allPages }) => {
  const productName = 'GoPro HERO10 Black';
  const productPriceAndQuantity = '$600 × 1';
  const orderStatusProcessing = 'Processing';
  // Use a fresh account so the order history is clean and the placed order is
  // unambiguously the one we view, cancel and verify.
  const email = `test+${Date.now()}@test.com`;

  await test.step('Register and log in as a fresh user', async () => {
    await allPages.loginPage.clickOnUserProfileIcon();
    await allPages.loginPage.validateSignInPage();
    await allPages.loginPage.clickOnSignupLink();
    await allPages.signupPage.assertSignupPage();
    await allPages.signupPage.signup('Test', 'User', email, process.env.PASSWORD);
    await allPages.signupPage.verifySuccessSignUp();
    await allPages.loginPage.validateSignInPage();
    await allPages.loginPage.login(email, process.env.PASSWORD);
    await allPages.loginPage.verifySuccessSignIn();
  })

  await test.step('Add product to cart and checkout', async () => {
    await allPages.inventoryPage.clickOnAllProductsLink();
    await allPages.inventoryPage.searchProduct(productName);
    await allPages.inventoryPage.verifyProductTitleVisible(productName);
    await allPages.inventoryPage.clickOnAddToCartIcon();
    await allPages.cartPage.clickOnCartIcon();
    await allPages.cartPage.verifyCartItemVisible(productName);
    await allPages.cartPage.clickOnCheckoutButton();
  })

  await test.step('Place order and click on continue shopping', async () => {
    await allPages.checkoutPage.verifyCheckoutTitle();
    await allPages.checkoutPage.fillShippingAddress(
      'Test', email, 'New York', 'New York', '123 Main St', '10001', 'United States'
    );
    await allPages.checkoutPage.clickSaveAddressButton();
    await allPages.checkoutPage.assertAddressAddedToast();
    await allPages.checkoutPage.selectCashOnDelivery();
    await allPages.checkoutPage.clickOnPlaceOrder();
    await allPages.checkoutPage.verifyOrderPlacedSuccessfully();
    await allPages.inventoryPage.clickOnContinueShopping();
  })

  await test.step('Verify order in My Orders', async () => {
    await allPages.loginPage.clickOnUserProfileIcon();
    await allPages.orderPage.clickOnMyOrdersTab();
    await allPages.orderPage.verifyMyOrdersTitle();
    await allPages.orderPage.verifyProductInOrderList(productName);
    await allPages.orderPage.verifyPriceAndQuantityInOrderList(productPriceAndQuantity);
    await allPages.orderPage.verifyOrderStatusInList(orderStatusProcessing, productName);
    await allPages.orderPage.clickViewDetailsForProduct(productName);
    await allPages.orderPage.verifyOrderDetailsTitle();
    await allPages.orderPage.verifyOrderSummary(productName);
  })

  await test.step('Cancel order and verify status is updated to Canceled', async () => {
    // View Details navigated to the order status page, so go back to the list first.
    await allPages.loginPage.clickOnUserProfileIcon();
    await allPages.orderPage.clickOnMyOrdersTab();
    await allPages.orderPage.verifyMyOrdersTitle();
    await allPages.orderPage.clickCancelOrderButton(1);
    await allPages.orderPage.confirmCancellation();
    await allPages.orderPage.verifyCancellationConfirmationMessage();
    // Re-open My Orders so the list refetches and shows the updated status.
    await allPages.loginPage.clickOnUserProfileIcon();
    await allPages.orderPage.clickOnMyOrdersTab();
    await allPages.orderPage.verifyMyOrdersTitle();
    await allPages.orderPage.verifyOrderRemovedAfterCancel(productName);
  })
});

test('Verify that a New User Can Successfully Complete the Journey from Registration to a Single Order Placement', async ({ allPages }) => {
  // fresh test data
  const email = `test+${Date.now()}@test.com`;
  const firstName = 'Test';
  const lastName = 'User';

  let productName: string;
  let productPrice: string;
  let productReviewCount;

  await test.step('Verify that user can register successfully', async () => {
    await allPages.loginPage.clickOnUserProfileIcon();
    await allPages.loginPage.validateSignInPage();
    await allPages.loginPage.clickOnSignupLink();
    await allPages.signupPage.assertSignupPage();
    await allPages.signupPage.signup(firstName, lastName, email, process.env.PASSWORD);
    await allPages.signupPage.verifySuccessSignUp();
  })

  await test.step('Verify that user can login successfully', async () => {
    await allPages.loginPage.validateSignInPage();
    await allPages.loginPage.login(email, process.env.PASSWORD);
    await allPages.loginPage.verifySuccessSignIn();
    await expect(allPages.homePage.getHomeNav()).toBeVisible({ timeout: 30000 });
  })

  

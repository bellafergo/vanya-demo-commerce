
    }

    async clickOnLogoutButton() {
        await this.page.locator(this.locators.logoutButton).click();
    }
    async validateSignInPage() {
        await expect(this.getLoginPageTitle()).toBeVisible({ timeout: 15000 });
    }

   

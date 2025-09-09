import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Globe, Smartphone, Database } from 'lucide-react';

interface SeleniumTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  category: 'basic' | 'intermediate' | 'advanced';
  starterCode: string;
  testScenarios: Array<{
    scenario: string;
    expectedResult: string;
    webElements?: string[];
  }>;
  icon: React.ReactNode;
}

interface SeleniumTemplateSelectorProps {
  onSelect: (template: SeleniumTemplate) => void;
  language: string;
}

const seleniumTemplates: SeleniumTemplate[] = [
  {
    id: 'login-form',
    name: 'Login Form Automation',
    description: 'Automate user login with form validation and error handling',
    language: 'selenium-java',
    category: 'basic',
    icon: <Monitor className="w-4 h-4" />,
    starterCode: `
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.By;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.junit.Test;
import org.junit.After;
import static org.junit.Assert.*;

public class LoginTest {
    private WebDriver driver;
    private WebDriverWait wait;
    
    @Test
    public void testUserLogin() {
        // TODO: Initialize WebDriver
        driver = new ChromeDriver();
        wait = new WebDriverWait(driver, 10);
        
        try {
            // TODO: Navigate to login page
            driver.get("https://example.com/login");
            
            // TODO: Find and fill username field
            WebElement usernameField = wait.until(
                ExpectedConditions.presenceOfElementLocated(By.id("username"))
            );
            usernameField.sendKeys("testuser@example.com");
            
            // TODO: Find and fill password field
            WebElement passwordField = driver.findElement(By.id("password"));
            passwordField.sendKeys("password123");
            
            // TODO: Click login button
            WebElement loginButton = driver.findElement(By.cssSelector("button[type='submit']"));
            loginButton.click();
            
            // TODO: Verify successful login
            WebElement welcomeMessage = wait.until(
                ExpectedConditions.presenceOfElementLocated(By.className("welcome-message"))
            );
            assertTrue("Login should be successful", welcomeMessage.isDisplayed());
            
        } finally {
            if (driver != null) {
                driver.quit();
            }
        }
    }
}`,
    testScenarios: [
      {
        scenario: 'Valid credentials login',
        expectedResult: 'User successfully logged in and redirected to dashboard',
        webElements: ['username field', 'password field', 'login button', 'welcome message']
      },
      {
        scenario: 'Invalid credentials handling',
        expectedResult: 'Error message displayed for incorrect credentials',
        webElements: ['error message', 'username field', 'password field']
      }
    ]
  },
  {
    id: 'e-commerce-cart',
    name: 'E-commerce Shopping Cart',
    description: 'Automate product selection, cart management, and checkout process',
    language: 'selenium-python',
    category: 'intermediate',
    icon: <Globe className="w-4 h-4" />,
    starterCode: `
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
import unittest

class ECommerceTest(unittest.TestCase):
    
    def setUp(self):
        self.driver = webdriver.Chrome()
        self.wait = WebDriverWait(self.driver, 10)
        self.driver.implicitly_wait(5)
    
    def test_add_product_to_cart(self):
        """Test adding a product to shopping cart"""
        # TODO: Navigate to product page
        self.driver.get("https://example-store.com/products")
        
        # TODO: Find and click on a product
        product = self.wait.until(
            EC.element_to_be_clickable((By.css_selector, ".product-card:first-child"))
        )
        product.click()
        
        # TODO: Add product to cart
        add_to_cart_btn = self.wait.until(
            EC.element_to_be_clickable((By.id, "add-to-cart"))
        )
        add_to_cart_btn.click()
        
        # TODO: Verify cart count updated
        cart_count = self.wait.until(
            EC.presence_of_element_located((By.class_name, "cart-count"))
        )
        self.assertEqual("1", cart_count.text)
    
    def test_checkout_process(self):
        """Test complete checkout flow"""
        # TODO: Add product to cart first
        self.test_add_product_to_cart()
        
        # TODO: Go to cart
        cart_icon = self.driver.find_element(By.class_name, "cart-icon")
        cart_icon.click()
        
        # TODO: Proceed to checkout
        checkout_btn = self.wait.until(
            EC.element_to_be_clickable((By.id, "checkout"))
        )
        checkout_btn.click()
        
        # TODO: Fill checkout form
        self.wait.until(EC.presence_of_element_located((By.id, "email"))).send_keys("test@example.com")
        self.driver.find_element(By.id, "address").send_keys("123 Test Street")
        
        # TODO: Complete purchase
        purchase_btn = self.driver.find_element(By.id, "complete-purchase")
        purchase_btn.click()
        
        # TODO: Verify order confirmation
        confirmation = self.wait.until(
            EC.presence_of_element_located((By.class_name, "order-confirmation"))
        )
        self.assertIn("Order confirmed", confirmation.text)
    
    def tearDown(self):
        self.driver.quit()

if __name__ == "__main__":
    unittest.main()`,
    testScenarios: [
      {
        scenario: 'Add single product to cart',
        expectedResult: 'Product added successfully, cart count shows 1',
        webElements: ['product card', 'add to cart button', 'cart count indicator']
      },
      {
        scenario: 'Complete checkout process',
        expectedResult: 'Order placed successfully with confirmation message',
        webElements: ['checkout form', 'email field', 'address field', 'purchase button', 'confirmation message']
      }
    ]
  },
  {
    id: 'mobile-responsive',
    name: 'Mobile Responsive Testing',
    description: 'Test responsive design across different device sizes and orientations',
    language: 'selenium-javascript',
    category: 'advanced',
    icon: <Smartphone className="w-4 h-4" />,
    starterCode: `
const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

class MobileResponsiveTest {
    constructor() {
        this.driver = null;
    }

    async setUp() {
        // Configure Chrome for mobile testing
        const options = new chrome.Options();
        options.addArguments('--disable-web-security');
        options.addArguments('--allow-running-insecure-content');
        
        this.driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
    }

    async testMobileNavigation() {
        try {
            // TODO: Set mobile viewport
            await this.driver.manage().window().setRect({
                width: 375,
                height: 667
            });

            // TODO: Navigate to website
            await this.driver.get('https://example.com');

            // TODO: Test mobile menu functionality
            const mobileMenuToggle = await this.driver.wait(
                until.elementLocated(By.className('mobile-menu-toggle')),
                5000
            );
            await mobileMenuToggle.click();

            // TODO: Verify mobile menu is visible
            const mobileMenu = await this.driver.wait(
                until.elementLocated(By.className('mobile-menu')),
                3000
            );
            const isMenuVisible = await mobileMenu.isDisplayed();
            console.assert(isMenuVisible, 'Mobile menu should be visible');

            // TODO: Test navigation link
            const homeLink = await mobileMenu.findElement(By.linkText('Home'));
            await homeLink.click();

            // TODO: Verify page navigation
            const currentUrl = await this.driver.getCurrentUrl();
            console.assert(currentUrl.includes('/home'), 'Should navigate to home page');

        } catch (error) {
            console.error('Mobile navigation test failed:', error);
            throw error;
        }
    }

    async testResponsiveLayout() {
        try {
            // TODO: Test different viewport sizes
            const viewports = [
                { width: 320, height: 568, name: 'Mobile' },
                { width: 768, height: 1024, name: 'Tablet' },
                { width: 1920, height: 1080, name: 'Desktop' }
            ];

            for (const viewport of viewports) {
                // TODO: Set viewport size
                await this.driver.manage().window().setRect(viewport);
                await this.driver.get('https://example.com');

                // TODO: Test responsive elements
                const header = await this.driver.findElement(By.tagName('header'));
                const headerSize = await header.getRect();

                // TODO: Verify responsive behavior
                if (viewport.width <= 768) {
                    // Mobile/Tablet specific checks
                    const mobileElements = await this.driver.findElements(
                        By.className('mobile-only')
                    );
                    console.assert(mobileElements.length > 0, 
                        \`Mobile elements should be visible on \${viewport.name}\`);
                }

                console.log(\`\${viewport.name} layout test passed\`);
            }

        } catch (error) {
            console.error('Responsive layout test failed:', error);
            throw error;
        }
    }

    async tearDown() {
        if (this.driver) {
            await this.driver.quit();
        }
    }
}

// TODO: Run tests
async function runTests() {
    const test = new MobileResponsiveTest();
    
    try {
        await test.setUp();
        await test.testMobileNavigation();
        await test.testResponsiveLayout();
        console.log('All mobile responsive tests passed!');
    } catch (error) {
        console.error('Test execution failed:', error);
    } finally {
        await test.tearDown();
    }
}

runTests();`,
    testScenarios: [
      {
        scenario: 'Mobile menu functionality',
        expectedResult: 'Mobile menu opens and closes correctly on small screens',
        webElements: ['mobile menu toggle', 'mobile menu panel', 'navigation links']
      },
      {
        scenario: 'Responsive layout adaptation',
        expectedResult: 'Layout adapts correctly across mobile, tablet, and desktop viewports',
        webElements: ['responsive containers', 'breakpoint-specific elements', 'flexible navigation']
      }
    ]
  }
];

export const SeleniumTemplateSelector: React.FC<SeleniumTemplateSelectorProps> = ({
  onSelect,
  language
}) => {
  const filteredTemplates = seleniumTemplates.filter(
    template => template.language === language || language === 'all'
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'basic': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Monitor className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Selenium Test Templates</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {template.icon}
                  {template.name}
                </div>
                <Badge className={getCategoryColor(template.category)}>
                  {template.category}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {template.description}
              </p>
              
              <div className="space-y-2">
                <h4 className="text-xs font-semibold">Test Scenarios:</h4>
                {template.testScenarios.map((scenario, index) => (
                  <div key={index} className="text-xs p-2 bg-muted/50 rounded">
                    <div className="font-medium">{scenario.scenario}</div>
                    <div className="text-muted-foreground mt-1">{scenario.expectedResult}</div>
                  </div>
                ))}
              </div>

              <Button 
                onClick={() => onSelect(template)}
                className="w-full"
                size="sm"
              >
                Use Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No Selenium templates available for the selected language.</p>
          <p className="text-sm mt-2">Try selecting a Selenium-specific language variant.</p>
        </div>
      )}
    </div>
  );
};

export default SeleniumTemplateSelector;
import os
import time
from datetime import date, datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def get_driver():
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    return webdriver.Remote('http://selenium:4444/wd/hub', options=chrome_options)

def end_session(driver, message = None, doExit = True):
    try:
        # Click log out button
        driver.find_element(By.CSS_SELECTOR, "#nztaSiteHeader a:not(.i-nzta-logo)").click()
    except:
        print("Failed to log out")
    driver.close()
    if message:
        print(message)
    if doExit:
        exit()

def change_booking(driver):
    # Visit site
    driver.get("https://online.nzta.govt.nz/licence-test/")

    # Get Started
    driver.find_element(By.ID, "btnContinue").click()

    # Fill in form and log in
    driver.find_element(By.CSS_SELECTOR, "input[formcontrolname='LicenceNumber']").send_keys(os.getenv('LicenceNumber'))
    driver.find_element(By.CSS_SELECTOR, "input[formcontrolname='LicenceVersion']").send_keys(os.getenv('LicenceVersion'))
    driver.find_element(By.CSS_SELECTOR, "input[formcontrolname='LastName']").send_keys(os.getenv('LastName'))
    driver.find_element(By.CSS_SELECTOR, "input[formcontrolname='DateOfBirth']").send_keys(os.getenv('DateOfBirth'))
    driver.find_element(By.ID, "btnContinue").click()

    # Reschedule existing booking if its more than a week away
    currentBookingDate = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "app-existing-booking dl dt:first-child + dd"))
    ).text
    currentBookingDate = datetime.strptime(currentBookingDate, "%A %d %B %Y, %H:%M %p")
    if (currentBookingDate - datetime.now()).days < 4:
        end_session(driver, "Current booking is very soon, so not gonna bother")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "btnContinue"))
    ).click()

    # View wellington dropdown
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "app-reschedule-slot"))
    )
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.LINK_TEXT, "Wellington"))
    ).click()
    driver.find_element(By.CSS_SELECTOR, "div.large-3").find_element(By.LINK_TEXT, "Wellington").click()
    driver.find_element(By.LINK_TEXT, "VTNZ Thorndon").click()

    # Get next available booking
    calendar = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "datePicker"))
    )
    while True:
        try:
            WebDriverWait(calendar, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "tbody td:not(.ui-state-disabled)"))
            ).click()
            break
        except:
            try:
                calendar.find_element(By.CSS_SELECTOR, ".ui-datepicker-next").click()
            except:
                # Reached the end of results - nothing we can really do!
                end_session(driver, "No available booking slots were found")

    # Check the booking date, if its after the current booking then don't bother
    timeslots = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "timeslots"))
    )
    time.sleep(5)
    timeslotDate = WebDriverWait(timeslots, 10).until(
        EC.presence_of_element_located((By.ID, "slotsDateHeading"))
    ).text
    timeslotDate = datetime.strptime(timeslotDate, "%A %d %B %Y")
    if currentBookingDate <= timeslotDate:
        end_session(driver, "Current booking date is before the next available slot")

    # Click on that booking slot
    WebDriverWait(timeslots, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "label"))
    ).click()
    time.sleep(5)

    # Try confirm slot selection
    driver.find_element(By.ID, "btnContinue").click()
    time.sleep(5)
    error = driver.find_element(By.CSS_SELECTOR, 'error').text
    if error:
        end_session(driver, 'Recieved the following error when trying to book the test:\n' + error)

    # Confirm booking change
    # driver.find_element(By.ID, "btnContinue").click()

    # All done wahoo
    end_session(driver, "Sucessfully changed booking to XYZ")

if __name__ == '__main__':
    driver = get_driver()
    try:
        change_booking(driver)
    except SystemExit:
        exit()
    except:
        end_session(driver, doExit = False)
        raise

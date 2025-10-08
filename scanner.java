import java.util.Scanner;

/**
 * The BankAccount class represents a simple bank account with a balance.
 */
class BankAccount {
    private double balance; // Private variable to store the account balance

    // Constructor to initialize the account with a starting balance
    public BankAccount(double initialBalance) {
        if (initialBalance >= 0) {
            this.balance = initialBalance;
        } else {
            this.balance = 0;
            System.out.println("Initial balance cannot be negative. Setting balance to 0.0.");
        }
    }

    // Method to deposit money into the account
    public void deposit(double amount) {
        if (amount > 0) {
            balance += amount;
            System.out.printf("Deposited $%.2f. New balance is $%.2f.%n", amount, balance);
        } else {
            System.out.println("Deposit amount must be positive.");
        }
    }

    // Method to withdraw money from the account
    public boolean withdraw(double amount) {
        if (amount > 0 && amount <= balance) {
            balance -= amount;
            System.out.printf("Withdrew $%.2f. New balance is $%.2f.%n", amount, balance);
            return true;
        } else if (amount > balance) {
            System.out.println("Withdrawal failed: Insufficient funds.");
            return false;
        } else {
            System.out.println("Withdrawal amount must be positive.");
            return false;
        }
    }

    // Getter method to retrieve the current balance
    public double getBalance() {
        return balance;
    }
}

/**
 * The Main class contains the entry point for the program.
 */
public class Main {
    public static void main(String[] args) {
        // Create an instance (object) of the BankAccount class
        BankAccount myAccount = new BankAccount(500.00); // Start with $500.00

        System.out.println("Welcome to the Simple Bank Program!");
        System.out.printf("Current balance: $%.2f%n", myAccount.getBalance());

        // Perform transactions
        myAccount.deposit(150.50); // Deposit $150.50

        myAccount.withdraw(200.00); // Withdraw $200.00

        // Attempt to overdraw
        myAccount.withdraw(1000.00); // This will fail

        // Check the final balance
        System.out.printf("%nFinal balance after all transactions: $%.2f%n", myAccount.getBalance());

        // Close resources (though not strictly necessary in this simple console app)
        // Scanner scanner = new Scanner(System.in);
        // scanner.close(); 
    }
}

"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import DashboardLayout from "./dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, FileUp, PlusCircle } from "lucide-react";

export default function Home() {
  return (
    <DashboardLayout>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-l font-bold">Dashboard</h1>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Veterinary Clinic Manager</h1>
        <p className="text-muted-foreground">Manage your veterinary clinic invoices and patient records.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Management</CardTitle>
              <CardDescription>Create and manage veterinary invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <Button asChild className="flex items-center">
                  <Link href="/invoices/create-new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex items-center">
                  <Link href="/invoices">
                    <FileText className="mr-2 h-4 w-4" />
                    View All Invoices
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>View detailed line items from all invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <Button asChild variant="outline" className="flex items-center">
                  <Link href="/line-items">
                    <FileUp className="mr-2 h-4 w-4" />
                    View Line Items
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

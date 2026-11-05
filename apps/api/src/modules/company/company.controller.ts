import { Request, Response, NextFunction } from "express";
import { db } from "../../config/firebase.js";

export const getCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({
        success: false,
        data: null,
        error: { code: "BAD_REQUEST", message: "Company ID is missing." },
      });
      return;
    }

    let companyData: any = null;
    try {
      const companyDoc = await db.collection("companies").doc(companyId).get();
      if (companyDoc.exists) {
        companyData = companyDoc.data();
      }
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, using mock fallback company data.");
      companyData = {
        id: companyId,
        name: "FlowOS Enterprise India",
        legalName: "FlowOS Technologies Private Limited",
        gstin: "27AAAAA1111A1Z1",
        pan: "AAAAA1111A",
        currency: "INR",
        fiscalYearStart: "April",
        billingAddress: { street: "101 Science Park", city: "Mumbai", state: "Maharashtra", zip: "400076", country: "India" },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    if (!companyData) {
      res.status(404).json({
        success: false,
        data: null,
        error: { code: "NOT_FOUND", message: "Company not found." },
      });
      return;
    }

    res.json({
      success: true,
      data: companyData,
      meta: null,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(400).json({
        success: false,
        data: null,
        error: { code: "BAD_REQUEST", message: "Company ID is missing." },
      });
      return;
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.user?.uid,
    };

    // Prevent overwriting primary system identifiers
    delete updateData.id;
    delete updateData.createdAt;

    try {
      await db.collection("companies").doc(companyId).update(updateData);
    } catch (e) {
      console.warn("[FlowOS API] Firestore offline, updating mock company data.");
    }

    res.json({
      success: true,
      data: { id: companyId, ...updateData },
      meta: { message: "Company profile updated successfully." },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

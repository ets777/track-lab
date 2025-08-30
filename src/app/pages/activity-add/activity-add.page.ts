import { Component, OnInit } from '@angular/core';
import { ActivityService } from '../../services/activity.service';
import { IonHeader, IonToolbar, IonTitle, IonInput, IonContent, IonItem, IonLabel, IonDatetime, IonRange, IonButton, IonText, IonTextarea, IonButtons } from "@ionic/angular/standalone";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IActivity } from 'src/app/db';
import { format } from 'date-fns';
import { Time } from 'src/app/Time';

@Component({
  selector: 'app-activity-add',
  templateUrl: './activity-add.page.html',
  styleUrl: './activity-add.page.scss',
  imports: [IonButtons, IonTextarea, IonText, IonButton, IonRange, IonLabel, IonItem, IonContent, IonInput, IonHeader, IonToolbar, IonTitle, FormsModule, ReactiveFormsModule],
})
export class ActivityAddPage implements OnInit {
  private defaultValue: number = 5;
  protected addActivityForm: FormGroup;

  constructor(
    private activityService: ActivityService,
    private formBuilder: FormBuilder,
  ) {
    this.addActivityForm = this.formBuilder.group({
      actions: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: [''],
      comment: [''],
      date: ['', Validators.required],
      mood: [this.defaultValue],
      energy: [this.defaultValue],
      satiety: [this.defaultValue],
      emotions: [''],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.setDefaultData();
  }

  async addActivity(): Promise<void> {
    const activity = this.addActivityForm.value;

    await this.activityService.add({
      ...activity,
    });
    
    await this.setDefaultData();
  }

  async setDefaultData(): Promise<void> {
    const lastActivity = await this.activityService.getLast();
    const currentTime = new Time().toString().slice(0, 5);

    this.addActivityForm.patchValue({
      actions: '',
      startTime: lastActivity?.endTime ?? currentTime,
      endTime: currentTime,
      comment: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      mood: lastActivity?.mood || this.defaultValue,
      energy: lastActivity?.energy || this.defaultValue,
      satiety: lastActivity?.satiety || this.defaultValue,
      emotions: '',
    });
  }
}
